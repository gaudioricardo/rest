import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

export function useBiometrics() {
  const [available, setAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometria');

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setAvailable(hasHardware && isEnrolled);

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      }
    })();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!available) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Autenticação Ugest ERP',
      fallbackLabel: 'Usar password',
      cancelLabel: 'Cancelar',
    });
    return result.success;
  }, [available]);

  return { available, biometricType, authenticate };
}
