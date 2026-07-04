import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, router } from 'expo-router';
import { useVoiceStore } from '../../lib/voiceStore';

export default function VoiceChannelScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [volumeTarget, setVolumeTarget] = useState<string | null>(null);
  const {
    connected,
    muted,
    deafened,
    cameraOn,
    myIdentity,
    participants,
    channelId,
    audioOutput,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    setAudioOutput,
    setParticipantVolume,
  } = useVoiceStore();

  useEffect(() => {
    if (channelId !== id) {
      joinChannel(id!, name!).catch((err) => {
        Alert.alert('Bağlantı Hatası', String(err?.message ?? err));
        router.back();
      });
    }
  }, [id]);

  async function handleLeave() {
    await leaveChannel();
    router.back();
  }

  function handleMinimize() {
    router.back();
  }

  async function handleToggleAudioOutput() {
    try {
      const newOutput = audioOutput === 'speaker' ? 'earpiece' : 'speaker';
      await setAudioOutput(newOutput);
    } catch (err: any) {
      Alert.alert('Ses Çıkışı Hatası', String(err?.message ?? err));
    }
  }

  const currentVolumeParticipant = participants.find((p) => p.identity === volumeTarget);

  if (!connected) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.connectingText}>Bağlanıyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleMinimize}>
          <Text style={styles.backButton}>‹ Kanallar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔊 {name}</Text>
        <Text style={styles.headerSubtitle}>
          {participants.length} kişi sesli kanalda
        </Text>
      </View>

      <FlatList
        data={participants}
        keyExtractor={(item) => item.identity}
        numColumns={2}
        contentContainerStyle={styles.participantGrid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.participantCard,
              item.isSpeaking && styles.participantSpeaking,
            ]}
            onLongPress={() => {
              if (item.identity !== myIdentity) {
                setVolumeTarget(item.identity);
              }
            }}
            disabled={item.identity === myIdentity}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.identity.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.participantName}>
              {item.identity} {item.identity === myIdentity ? '(sen)' : ''}
            </Text>
            {item.isMuted && <Text style={styles.mutedIcon}>🔇</Text>}
          </TouchableOpacity>
        )}
      />

      <View style={styles.controlsRow1}>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={handleToggleAudioOutput}
        >
          <Text style={styles.smallButtonText}>
            {audioOutput === 'speaker' ? '🔊' : '📱'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, cameraOn && styles.smallButtonActive]}
          onPress={toggleCamera}
        >
          <Text style={styles.smallButtonText}>📷</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallButton, deafened && styles.smallButtonActive]}
          onPress={toggleDeafen}
        >
          <Text style={styles.smallButtonText}>{deafened ? '🙉' : '🎧'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, muted && styles.controlButtonActive]}
          onPress={toggleMute}
          disabled={deafened}
        >
          <Text style={styles.controlButtonText}>
            {muted ? '🔇 Sesi Aç' : '🎤 Sesi Kapat'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.leaveButton]}
          onPress={handleLeave}
        >
          <Text style={styles.controlButtonText}>📞 Ayrıl</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={volumeTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setVolumeTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVolumeTarget(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{volumeTarget} — Ses Seviyesi</Text>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={2}
              value={currentVolumeParticipant?.volume ?? 1}
              minimumTrackTintColor="#5865f2"
              maximumTrackTintColor="#4e5058"
              thumbTintColor="#5865f2"
              onValueChange={(value) => {
                if (volumeTarget) setParticipantVolume(volumeTarget, value);
              }}
            />
            <Text style={styles.volumeLabel}>
              {Math.round((currentVolumeParticipant?.volume ?? 1) * 100)}%
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#313338',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#313338',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#26282c',
  },
  backButton: {
    color: '#5865f2',
    fontSize: 15,
    marginBottom: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#949ba4',
    fontSize: 13,
    marginTop: 4,
  },
  participantGrid: {
    padding: 12,
  },
  participantCard: {
    flex: 1,
    backgroundColor: '#2b2d31',
    borderRadius: 12,
    margin: 6,
    padding: 20,
    alignItems: 'center',
    minHeight: 130,
    justifyContent: 'center',
  },
  participantSpeaking: {
    borderWidth: 2,
    borderColor: '#23a559',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5865f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  participantName: {
    color: '#dbdee1',
    fontSize: 13,
    textAlign: 'center',
  },
  mutedIcon: {
    marginTop: 4,
    fontSize: 14,
  },
  controlsRow1: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 12,
  },
  smallButton: {
    backgroundColor: '#2b2d31',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonActive: {
    backgroundColor: '#ed4245',
  },
  smallButtonText: {
    fontSize: 20,
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#26282c',
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#2b2d31',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#ed4245',
  },
  leaveButton: {
    backgroundColor: '#ed4245',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2b2d31',
    borderRadius: 12,
    padding: 20,
    width: 280,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  volumeLabel: {
    color: '#949ba4',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});