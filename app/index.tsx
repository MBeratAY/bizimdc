import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const [status, setStatus] = useState('Baglaniyor...');

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase.auth.getSession();
      if (error) {
        setStatus('HATA: ' + error.message);
      } else {
        setStatus('Supabase baglantisi basarili!');
      }
    }
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discord Clone</Text>
      <Text style={styles.subtitle}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#949ba4',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
