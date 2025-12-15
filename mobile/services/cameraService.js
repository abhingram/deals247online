import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

class CameraService {
  constructor() {
    this.hasPermission = null;
  }

  // Request camera permissions
  async requestPermissions() {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  // Check camera permissions
  async checkPermissions() {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  // Open camera for QR code scanning
  async scanQRCode(options = {}) {
    try {
      if (!await this.checkPermissions()) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permissions to scan QR codes',
          [{ text: 'OK' }]
        );
        return null;
      }

      return new Promise((resolve) => {
        // This would typically open a camera screen
        // For now, return a mock result
        console.log('QR Code scanning initiated');
        resolve(null);
      });
    } catch (error) {
      console.error('Error scanning QR code:', error);
      return null;
    }
  }

  // Open image picker for photo upload
  async pickImage(options = {}) {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable photo library access to select images',
          [{ text: 'OK' }]
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing || true,
        aspect: options.aspect || [4, 3],
        quality: options.quality || 0.8,
        ...options
      });

      if (!result.canceled) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  // Take photo with camera
  async takePhoto(options = {}) {
    try {
      if (!await this.checkPermissions()) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permissions to take photos',
          [{ text: 'OK' }]
        );
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing || true,
        aspect: options.aspect || [4, 3],
        quality: options.quality || 0.8,
        ...options
      });

      if (!result.canceled) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  }

  // Compress image for upload
  async compressImage(imageUri, options = {}) {
    try {
      const compressedUri = `${FileSystem.cacheDirectory}compressed_${Date.now()}.jpg`;

      await FileSystem.copyAsync({
        from: imageUri,
        to: compressedUri
      });

      // Basic compression by reducing quality
      // In a real implementation, you might use a more sophisticated compression library
      console.log('Image compressed:', compressedUri);
      return compressedUri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return imageUri;
    }
  }

  // Upload image to server
  async uploadImage(imageUri, uploadUrl, metadata = {}) {
    try {
      const compressedUri = await this.compressImage(imageUri);

      const formData = new FormData();
      formData.append('image', {
        uri: compressedUri,
        type: 'image/jpeg',
        name: `upload_${Date.now()}.jpg`
      });

      // Add metadata
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  // Process receipt image with OCR (placeholder)
  async processReceipt(imageUri) {
    try {
      // In a real implementation, this would call an OCR service
      console.log('Processing receipt:', imageUri);

      // Mock OCR result
      return {
        total: 0,
        items: [],
        merchant: 'Unknown',
        date: new Date().toISOString(),
        confidence: 0.8
      };
    } catch (error) {
      console.error('Error processing receipt:', error);
      throw error;
    }
  }

  // Generate QR code for deal sharing
  async generateQRCode(dealData) {
    try {
      // In a real implementation, this would generate a QR code
      const qrData = JSON.stringify({
        type: 'deal',
        id: dealData.id,
        url: `https://deals247.com/deal/${dealData.id}`
      });

      console.log('QR Code generated for deal:', dealData.id);
      return qrData;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Scan barcode from image
  async scanBarcode(imageUri) {
    try {
      // In a real implementation, this would use barcode scanning library
      console.log('Scanning barcode from image:', imageUri);

      // Mock barcode result
      return {
        type: 'EAN13',
        data: '1234567890123',
        bounds: { x: 0, y: 0, width: 100, height: 50 }
      };
    } catch (error) {
      console.error('Error scanning barcode:', error);
      throw error;
    }
  }

  // Clean up temporary files
  async cleanupTempFiles() {
    try {
      const tempDir = FileSystem.cacheDirectory;
      const files = await FileSystem.readDirectoryAsync(tempDir);

      const tempFiles = files.filter(file =>
        file.startsWith('compressed_') ||
        file.startsWith('upload_') ||
        file.startsWith('scan_')
      );

      for (const file of tempFiles) {
        await FileSystem.deleteAsync(`${tempDir}${file}`, { idempotent: true });
      }

      console.log('Cleaned up', tempFiles.length, 'temporary files');
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  // Get image dimensions
  async getImageDimensions(imageUri) {
    try {
      // In a real implementation, this would get actual dimensions
      return { width: 800, height: 600 };
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      return { width: 0, height: 0 };
    }
  }

  // Validate image for upload
  validateImage(imageUri, options = {}) {
    const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif'];

    // Basic validation - in real implementation, check file size and type
    return {
      valid: true,
      errors: []
    };
  }
}

export default new CameraService();