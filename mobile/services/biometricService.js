import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

class BiometricService {
  constructor() {
    this.isAvailable = false;
    this.biometricTypes = [];
    this.checkAvailability();
  }

  // Check if biometric authentication is available
  async checkAvailability() {
    try {
      this.isAvailable = await LocalAuthentication.hasHardwareAsync();
      this.biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      console.log('Biometric available:', this.isAvailable);
      console.log('Supported types:', this.biometricTypes);

      return {
        isAvailable: this.isAvailable,
        types: this.biometricTypes,
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return { isAvailable: false, types: [] };
    }
  }

  // Authenticate user with biometrics
  async authenticate(reason = 'Authenticate to access Deals247') {
    try {
      if (!this.isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log('Biometric authentication successful');
        await this.recordSuccessfulAuth();
        return { success: true };
      } else {
        console.log('Biometric authentication failed:', result.error);
        return {
          success: false,
          error: result.error,
          message: this.getErrorMessage(result.error)
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'authentication_error',
        message: 'Authentication failed'
      };
    }
  }

  // Authenticate for sensitive operations (deals, payments)
  async authenticateForSensitiveOperation(operation = 'access sensitive data') {
    const reason = `Please authenticate to ${operation}`;
    return await this.authenticate(reason);
  }

  // Get user-friendly error message
  getErrorMessage(error) {
    switch (error) {
      case 'user_cancel':
        return 'Authentication was cancelled';
      case 'system_cancel':
        return 'Authentication was cancelled by the system';
      case 'timeout':
        return 'Authentication timed out';
      case 'lockout':
        return 'Too many failed attempts. Try again later';
      case 'not_enrolled':
        return 'No biometric authentication enrolled';
      case 'user_fallback':
        return 'PIN authentication selected';
      default:
        return 'Authentication failed';
    }
  }

  // Record successful authentication
  async recordSuccessfulAuth() {
    try {
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem('lastBiometricAuth', timestamp);

      // Update authentication count
      const count = await this.getAuthCount();
      await AsyncStorage.setItem('biometricAuthCount', (count + 1).toString());
    } catch (error) {
      console.error('Error recording auth:', error);
    }
  }

  // Get authentication statistics
  async getAuthStats() {
    try {
      const lastAuth = await AsyncStorage.getItem('lastBiometricAuth');
      const count = await this.getAuthCount();

      return {
        lastAuth: lastAuth ? new Date(lastAuth) : null,
        totalCount: count,
        isAvailable: this.isAvailable,
        types: this.biometricTypes,
      };
    } catch (error) {
      console.error('Error getting auth stats:', error);
      return {};
    }
  }

  // Get authentication count
  async getAuthCount() {
    try {
      const count = await AsyncStorage.getItem('biometricAuthCount');
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  // Check if biometric is enrolled
  async isEnrolled() {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return false;
    }
  }

  // Enable/disable biometric authentication
  async setBiometricEnabled(enabled) {
    try {
      await AsyncStorage.setItem('biometricEnabled', enabled.toString());
      return true;
    } catch (error) {
      console.error('Error setting biometric preference:', error);
      return false;
    }
  }

  // Check if biometric is enabled by user
  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      return enabled === null ? true : enabled === 'true'; // Default to true
    } catch (error) {
      return true;
    }
  }

  // Secure sensitive data with biometric check
  async accessSensitiveData(dataKey, reason = 'access sensitive data') {
    try {
      // First check if biometric is enabled
      const enabled = await this.isBiometricEnabled();
      if (!enabled) {
        return await AsyncStorage.getItem(dataKey);
      }

      // Authenticate before accessing
      const authResult = await this.authenticate(reason);
      if (!authResult.success) {
        throw new Error('Authentication required');
      }

      // Access the data
      const data = await AsyncStorage.getItem(dataKey);
      return data;
    } catch (error) {
      console.error('Error accessing sensitive data:', error);
      throw error;
    }
  }

  // Store sensitive data with biometric protection
  async storeSensitiveData(dataKey, data, requireAuth = true) {
    try {
      if (requireAuth) {
        const enabled = await this.isBiometricEnabled();
        if (enabled) {
          const authResult = await this.authenticate('store sensitive data');
          if (!authResult.success) {
            throw new Error('Authentication required');
          }
        }
      }

      await AsyncStorage.setItem(dataKey, data);
      return true;
    } catch (error) {
      console.error('Error storing sensitive data:', error);
      throw error;
    }
  }

  // Clear biometric data
  async clearBiometricData() {
    try {
      await AsyncStorage.removeItem('lastBiometricAuth');
      await AsyncStorage.removeItem('biometricAuthCount');
      await AsyncStorage.removeItem('biometricEnabled');
      return true;
    } catch (error) {
      console.error('Error clearing biometric data:', error);
      return false;
    }
  }

  // Get biometric type name
  getBiometricTypeName() {
    if (this.biometricTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (this.biometricTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    } else if (this.biometricTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    } else {
      return 'Biometric';
    }
  }

  // Check if device supports specific biometric type
  supportsBiometricType(type) {
    return this.biometricTypes.includes(type);
  }

  // Get security level
  async getSecurityLevel() {
    try {
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
      return securityLevel;
    } catch (error) {
      console.error('Error getting security level:', error);
      return LocalAuthentication.SecurityLevel.NONE;
    }
  }
}

export default new BiometricService();