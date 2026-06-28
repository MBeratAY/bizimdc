import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username || !email || !password || !inviteCode) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldur.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı.');
      return;
    }

    setLoading(true);

    // 1. Davet kodunu kontrol et
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.trim())
      .eq('used', false)
      .single();

    if (inviteError || !invite) {
      setLoading(false);
      Alert.alert('Geçersiz Davet Kodu', 'Bu kod geçersiz veya zaten kullanılmış.');
      return;
    }

    // 2. Kullanıcı adı zaten alınmış mı kontrol et
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.trim())
      .single();

    if (existingProfile) {
      setLoading(false);
      Alert.alert('Hata', 'Bu kullanıcı adı zaten alınmış.');
      return;
    }

    // 3. Hesabı oluştur
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !authData.user) {
      setLoading(false);
      Alert.alert('Kayıt Hatası', signUpError?.message ?? 'Bilinmeyen hata');
      return;
    }

    // 4. Profil oluştur
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      username: username.trim(),
    });

    if (profileError) {
      setLoading(false);
      Alert.alert('Hata', 'Profil oluşturulamadı: ' + profileError.message);
      return;
    }

    // 5. Davet kodunu "kullanıldı" olarak işaretle
    await supabase
      .from('invite_codes')
      .update({ used: true, used_by: authData.user.id })
      .eq('id', invite.id);

    setLoading(false);
    Alert.alert('Başarılı', 'Hesabın oluşturuldu!', [
      { text: 'Tamam', onPress: () => router.replace('/') },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>Hesap Oluştur</Text>
        <Text style={styles.subtitle}>Kapalı gruba katılmak için davet kodun gerekli</Text>

        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          placeholderTextColor="#72767d"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#72767d"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre (en az 6 karakter)"
          placeholderTextColor="#72767d"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Davet Kodu"
          placeholderTextColor="#72767d"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
          </Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>
              Zaten hesabın var mı? <Text style={styles.linkTextBold}>Giriş Yap</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f22',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#949ba4',
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2b2d31',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#5865f2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#949ba4',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#ffffff',
    fontWeight: '600',
  },
});