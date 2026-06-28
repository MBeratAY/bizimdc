import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Message = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username?: string;
};

export default function ChannelScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) setUserId(userData.user.id);

      await loadMessages();
    }
    init();

    // Realtime: yeni mesajları dinle
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${id}` },
        async (payload: any) => {
          const newMsg = payload.new;
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newMsg.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, username: profile?.username ?? 'Bilinmeyen' },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username)')
      .eq('channel_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      const formatted = data.map((msg: any) => ({
        ...msg,
        username: msg.profiles?.username ?? 'Bilinmeyen',
      }));
      setMessages(formatted);
    }
  }

  async function sendMessage() {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');

    const { error } = await supabase.from('messages').insert({
      channel_id: id,
      user_id: userId,
      content,
    });

    if (error) {
      console.log('Mesaj gönderme hatası:', error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹ Kanallar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}># {name}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <Text style={styles.messageUsername}>{item.username}</Text>
            <Text style={styles.messageContent}>{item.content}</Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={`#${name} kanalına mesaj gönder`}
          placeholderTextColor="#72767d"
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#313338',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#26282c',
  },
  backButton: {
    color: '#5865f2',
    fontSize: 15,
    marginRight: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  messageList: {
    padding: 16,
  },
  messageRow: {
    marginBottom: 14,
  },
  messageUsername: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageContent: {
    color: '#dbdee1',
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#26282c',
  },
  input: {
    flex: 1,
    backgroundColor: '#383a40',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#5865f2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});