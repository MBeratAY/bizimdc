import { create } from 'zustand';
import { Room, RoomEvent, Track, RemoteAudioTrack } from 'livekit-client';
import { AudioSession, AndroidAudioTypePresets } from '@livekit/react-native';
import { supabase } from './supabase';

type Participant = {
  identity: string;
  isSpeaking: boolean;
  isMuted: boolean;
  volume: number;
};

type VoiceState = {
  room: Room | null;
  channelId: string | null;
  channelName: string | null;
  connected: boolean;
  muted: boolean;
  deafened: boolean;
  cameraOn: boolean;
  myIdentity: string;
  participants: Participant[];
  audioOutput: 'speaker' | 'earpiece';
  joinChannel: (channelId: string, channelName: string) => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  setAudioOutput: (output: 'speaker' | 'earpiece') => Promise<void>;
  setParticipantVolume: (identity: string, volume: number) => void;
};

export const useVoiceStore = create<VoiceState>((set, get) => ({
  room: null,
  channelId: null,
  channelName: null,
  connected: false,
  muted: false,
  deafened: false,
  cameraOn: false,
  myIdentity: '',
  participants: [],
  audioOutput: 'speaker',

  joinChannel: async (channelId: string, channelName: string) => {
    const current = get().room;
    if (current) {
      await current.disconnect();
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Oturum bulunamadı');

    const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
      'livekit-token',
      { body: { roomName: `voice-${channelId}` } }
    );
    if (tokenError || !tokenData?.token) {
      throw new Error('Token alınamadı: ' + tokenError?.message);
    }

    await AudioSession.configureAudio({
      android: {
        audioTypeOptions: AndroidAudioTypePresets.communication,
      },
    });
    await AudioSession.startAudioSession();

    const newRoom = new Room();

    function sync() {
      const prevParticipants = get().participants;
      const volumeMap = new Map(prevParticipants.map((p) => [p.identity, p.volume]));

      const list: Participant[] = [];
      list.push({
        identity: newRoom.localParticipant.identity,
        isSpeaking: newRoom.localParticipant.isSpeaking,
        isMuted: !newRoom.localParticipant.isMicrophoneEnabled,
        volume: 1,
      });
      newRoom.remoteParticipants.forEach((p) => {
        list.push({
          identity: p.identity,
          isSpeaking: p.isSpeaking,
          isMuted: !p.isMicrophoneEnabled,
          volume: volumeMap.get(p.identity) ?? 1,
        });
      });
      set({ participants: list });
    }

    newRoom
      .on(RoomEvent.ParticipantConnected, sync)
      .on(RoomEvent.ParticipantDisconnected, sync)
      .on(RoomEvent.ActiveSpeakersChanged, sync)
      .on(RoomEvent.TrackMuted, sync)
      .on(RoomEvent.TrackUnmuted, sync)
      .on(RoomEvent.Disconnected, () => {
        set({
          room: null,
          channelId: null,
          channelName: null,
          connected: false,
          participants: [],
          deafened: false,
          cameraOn: false,
        });
      });

    const livekitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL!;
    await newRoom.connect(livekitUrl, tokenData.token);
    await newRoom.localParticipant.setMicrophoneEnabled(true);

    set({
      room: newRoom,
      channelId,
      channelName,
      connected: true,
      muted: false,
      deafened: false,
      cameraOn: false,
      myIdentity: newRoom.localParticipant.identity,
    });
    sync();

    // Diğer kullanıcılara sesli kanala katıldığını bildir
    supabase.functions.invoke('send-voice-join-notification', {
      body: { channelId, channelName },
    }).catch((err) => {
      console.log('Sesli kanal bildirimi gönderilemedi:', err);
    });
  },

  leaveChannel: async () => {
    const room = get().room;
    if (room) {
      await room.disconnect();
      await AudioSession.stopAudioSession();
    }
    set({
      room: null,
      channelId: null,
      channelName: null,
      connected: false,
      participants: [],
      deafened: false,
      cameraOn: false,
    });
  },

  toggleMute: async () => {
    const room = get().room;
    if (!room) return;
    const newMuted = !get().muted;
    await room.localParticipant.setMicrophoneEnabled(!newMuted);
    set({ muted: newMuted });
  },

  toggleDeafen: async () => {
    const room = get().room;
    if (!room) return;
    const newDeafened = !get().deafened;

    // Sağırlaştırınca mikrofonu da otomatik kapat (Discord davranışı)
    if (newDeafened) {
      await room.localParticipant.setMicrophoneEnabled(false);
      // Tüm uzak katılımcıların sesini kıs
      room.remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          if (pub.track) (pub.track as RemoteAudioTrack).setVolume(0);
        });
      });
    } else {
      await room.localParticipant.setMicrophoneEnabled(true);
      room.remoteParticipants.forEach((p) => {
        p.audioTrackPublications.forEach((pub) => {
          if (pub.track) (pub.track as RemoteAudioTrack).setVolume(1);
        });
      });
    }

    set({ deafened: newDeafened, muted: newDeafened });
  },

  toggleCamera: async () => {
    const room = get().room;
    if (!room) return;
    const newCameraOn = !get().cameraOn;
    await room.localParticipant.setCameraEnabled(newCameraOn);
    set({ cameraOn: newCameraOn });
  },

  setAudioOutput: async (output: 'speaker' | 'earpiece') => {
    await AudioSession.selectAudioOutput(output);
    set({ audioOutput: output });
  },

  setParticipantVolume: (identity: string, volume: number) => {
    const room = get().room;
    if (!room) return;

    room.remoteParticipants.forEach((p) => {
      if (p.identity === identity) {
        p.audioTrackPublications.forEach((pub) => {
          if (pub.track) (pub.track as RemoteAudioTrack).setVolume(volume);
        });
      }
    });

    set((state) => ({
      participants: state.participants.map((p) =>
        p.identity === identity ? { ...p, volume } : p
      ),
    }));
  },
}));