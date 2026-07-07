import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log('Push bildirimleri sadece gerçek cihazlarda çalışır.');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Bildirim İzni', 'Bildirim izni verilmedi: ' + finalStatus);
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      Alert.alert('Hata', 'Project ID bulunamadı! Constants: ' + JSON.stringify(Constants.expoConfig?.extra));
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert('Hata', 'Kullanıcı bulunamadı: ' + userError?.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ push_token: pushToken })
      .eq('id', userData.user.id);

    if (updateError) {
      Alert.alert('Kaydetme Hatası', updateError.message);
      return;
    }

    Alert.alert('Başarılı', 'Push token kaydedildi: ' + pushToken.substring(0, 30) + '...');

    return pushToken;
  } catch (err: any) {
    Alert.alert('Genel Hata', String(err?.message ?? err));
  }
}