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

type Channel = {
  id: string;
  name: string;
};

export default function ChannelListScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

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
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discord Clone</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.welcomeText}>Hoş geldin, {username || '...'}</Text>

      <Text style={styles.sectionTitle}>METİN KANALLARI</Text>

      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.channelItem}
            onPress={() => router.push(`/channel/${item.id}?name=${item.name}`)}
          >
            <Text style={styles.channelHash}>#</Text>
            <Text style={styles.channelName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>Henüz kanal yok.</Text>
          ) : null
        }
      />
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
    marginBottom: 8,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  channelHash: {
    color: '#80848e',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
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
});