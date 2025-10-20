import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';
import { userApi } from './api';

export function setupPushNotifications() {
  if (Platform.OS !== 'ios') {
    return;
  }

  PushNotificationIOS.addEventListener('register', (token) => {
    console.log('Device token:', token);
    userApi.updateDeviceToken(token).catch(console.error);
  });

  PushNotificationIOS.addEventListener('notification', (notification) => {
    console.log('Notification received:', notification);
    notification.finish(PushNotificationIOS.FetchResult.NoData);
  });

  PushNotificationIOS.addEventListener('registrationError', (error) => {
    console.error('Registration error:', error);
  });

  PushNotificationIOS.requestPermissions({
    alert: true,
    badge: true,
    sound: true,
  });
}
