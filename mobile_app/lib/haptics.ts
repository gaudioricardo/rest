import { Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const options = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

export function hapticLight() {
  if (Platform.OS !== 'web') {
    ReactNativeHapticFeedback.trigger('impactLight', options);
  }
}

export function hapticMedium() {
  if (Platform.OS !== 'web') {
    ReactNativeHapticFeedback.trigger('impactMedium', options);
  }
}

export function hapticSuccess() {
  if (Platform.OS !== 'web') {
    ReactNativeHapticFeedback.trigger('notificationSuccess', options);
  }
}

export function hapticWarning() {
  if (Platform.OS !== 'web') {
    ReactNativeHapticFeedback.trigger('notificationWarning', options);
  }
}

export function hapticError() {
  if (Platform.OS !== 'web') {
    ReactNativeHapticFeedback.trigger('notificationError', options);
  }
}
