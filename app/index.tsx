import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useVoiceStore } from '../lib/voiceStore';

type Channel = {
  id: string;
  name: string;
  type: 'text' | 'voice';
};

export default function ChannelListScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const { connected, channelName, leaveChannel } = useVoiceStore();

  useEffect(() => {
    async function loadData() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userData.user.id)
          .single();
        if (profile) setUsername(profile.username);
      }

      const { data: channelData } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (channelData) setChannels(channelData);
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleLogout() {
    await leaveChannel();
    await supabase.auth.signOut();
  }

  function handleChannelPress(channel: Channel) {
    if (channel.type === 'voice') {
      router.push(`/voice/${channel.id}?name=${channel.name}`);
    } else {
      router.push(`/channel/${channel.id}?name=${channel.name}`);
    }
  }

  function handleReturnToVoice() {
    const { channelId, channelName } = useVoiceStore.getState();
    if (channelId) {
      router.push(`/voice/${channelId}?name=${channelName}`);
    }
  }

  async function handleLeaveVoice() {
    await leaveChannel();
  }

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discord Clone</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.welcomeText}>Hoş geldin, {username || '...'}</Text>

      <FlatList
        data={[
          { type: 'header' as const, title: 'METİN KANALLARI', key: 'text-header' },
          ...textChannels.map((c) => ({ type: 'channel' as const, channel: c, key: c.id })),
          { type: 'header' as const, title: 'SESLİ KANALLAR', key: 'voice-header' },
          ...voiceChannels.map((c) => ({ type: 'channel' as const, channel: c, key: c.id })),
        ]}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionTitle}>{item.title}</Text>;
          }
          const channel = item.channel!;
          return (
            <TouchableOpacity
              style={styles.channelItem}
              onPress={() => handleChannelPress(channel)}
            >
              <Text style={styles.channelIcon}>
                {channel.type === 'voice' ? '🔊' : '#'}
              </Text>
              <Text style={styles.channelName}>{channel.name}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>Henüz kanal yok.</Text>
          ) : null
        }
      />

      {connected && (
        <View style={styles.voiceBar}>
          <TouchableOpacity style={styles.voiceBarInfo} onPress={handleReturnToVoice}>
            <Text style={styles.voiceBarIcon}>🔊</Text>
            <View>
              <Text style={styles.voiceBarTitle}>Sesli Bağlısın</Text>
              <Text style={styles.voiceBarSubtitle}>{channelName}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.voiceBarLeave} onPress={handleLeaveVoice}>
            <Text style={styles.voiceBarLeaveText}>📞</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#313338',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoutText: {
    color: '#ed4245',
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeText: {
    color: '#949ba4',
    fontSize: 14,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#949ba4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  channelIcon: {
    color: '#80848e',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
    width: 22,
  },
  channelName: {
    color: '#dbdee1',
    fontSize: 16,
  },
  emptyText: {
    color: '#72767d',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2b2d31',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  voiceBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voiceBarIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  voiceBarTitle: {
    color: '#23a559',
    fontSize: 13,
    fontWeight: '600',
  },
  voiceBarSubtitle: {
    color: '#949ba4',
    fontSize: 12,
  },
  voiceBarLeave: {
    backgroundColor: '#ed4245',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBarLeaveText: {
    fontSize: 16,
  },
});