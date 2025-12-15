import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class LocationService {
  constructor() {
    this.hasPermission = null;
    this.currentLocation = null;
    this.watchId = null;
  }

  // Request location permissions
  async requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to find nearby deals',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Request background permissions for continuous location updates
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      this.hasPermission = status === 'granted';

      return {
        foreground: status === 'granted',
        background: backgroundStatus === 'granted'
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  // Check location permissions
  async checkPermissions() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  // Get current location
  async getCurrentLocation(options = {}) {
    try {
      if (!await this.checkPermissions()) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: options.accuracy || Location.Accuracy.High,
        timeout: options.timeout || 15000,
        ...options
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      // Cache location
      await this.cacheLocation(this.currentLocation);

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // Start location watching
  async startWatchingLocation(options = {}) {
    try {
      if (!await this.checkPermissions()) {
        throw new Error('Location permission not granted');
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: options.accuracy || Location.Accuracy.High,
          timeInterval: options.timeInterval || 30000, // 30 seconds
          distanceInterval: options.distanceInterval || 100, // 100 meters
          ...options
        },
        (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          };

          // Cache location
          this.cacheLocation(this.currentLocation);

          // Notify subscribers
          this.notifyLocationUpdate(this.currentLocation);
        }
      );

      return this.watchId;
    } catch (error) {
      console.error('Error starting location watch:', error);
      throw error;
    }
  }

  // Stop location watching
  async stopWatchingLocation() {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  // Cache location data
  async cacheLocation(location) {
    try {
      await AsyncStorage.setItem('lastLocation', JSON.stringify(location));
      await AsyncStorage.setItem('locationTimestamp', location.timestamp.toString());
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }

  // Get cached location
  async getCachedLocation() {
    try {
      const locationString = await AsyncStorage.getItem('lastLocation');
      if (locationString) {
        return JSON.parse(locationString);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached location:', error);
      return null;
    }
  }

  // Reverse geocode (get address from coordinates)
  async reverseGeocode(location) {
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      return address[0] || null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Geocode (get coordinates from address)
  async geocode(address) {
    try {
      const locations = await Location.geocodeAsync(address);
      return locations[0] || null;
    } catch (error) {
      console.error('Error geocoding:', error);
      return null;
    }
  }

  // Calculate distance between two points
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // Distance in kilometers
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Find nearby deals based on location
  async findNearbyDeals(radiusKm = 10) {
    try {
      const location = await this.getCurrentLocation();
      if (!location) return [];

      // In a real implementation, this would call the API with location
      console.log('Finding deals near:', location.latitude, location.longitude);

      // Mock nearby deals
      return [
        {
          id: 1,
          title: 'Nearby Deal 1',
          distance: 2.5,
          store: 'Local Store',
          discount: '20% off'
        },
        {
          id: 2,
          title: 'Nearby Deal 2',
          distance: 5.1,
          store: 'Another Store',
          discount: '15% off'
        }
      ];
    } catch (error) {
      console.error('Error finding nearby deals:', error);
      return [];
    }
  }

  // Find nearby stores
  async findNearbyStores(radiusKm = 5) {
    try {
      const location = await this.getCurrentLocation();
      if (!location) return [];

      console.log('Finding stores near:', location.latitude, location.longitude);

      // Mock nearby stores
      return [
        {
          id: 1,
          name: 'Store A',
          distance: 1.2,
          address: '123 Main St',
          deals: 15
        },
        {
          id: 2,
          name: 'Store B',
          distance: 2.8,
          address: '456 Oak Ave',
          deals: 8
        }
      ];
    } catch (error) {
      console.error('Error finding nearby stores:', error);
      return [];
    }
  }

  // Set location preferences
  async setLocationPreferences(preferences) {
    try {
      await AsyncStorage.setItem('locationPreferences', JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Error setting location preferences:', error);
      return false;
    }
  }

  // Get location preferences
  async getLocationPreferences() {
    try {
      const preferences = await AsyncStorage.getItem('locationPreferences');
      return preferences ? JSON.parse(preferences) : {
        enableLocation: true,
        searchRadius: 10,
        autoUpdate: true,
        backgroundUpdates: false,
      };
    } catch (error) {
      console.error('Error getting location preferences:', error);
      return {};
    }
  }

  // Location subscribers for real-time updates
  locationSubscribers = new Set();

  // Subscribe to location updates
  subscribeToLocationUpdates(callback) {
    this.locationSubscribers.add(callback);
    return () => this.locationSubscribers.delete(callback);
  }

  // Notify location update subscribers
  notifyLocationUpdate(location) {
    this.locationSubscribers.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error notifying location subscriber:', error);
      }
    });
  }

  // Check if location services are enabled
  async isLocationEnabled() {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  // Get location accuracy options
  getAccuracyOptions() {
    return {
      lowest: Location.Accuracy.Lowest,
      low: Location.Accuracy.Low,
      balanced: Location.Accuracy.Balanced,
      high: Location.Accuracy.High,
      highest: Location.Accuracy.Highest,
    };
  }

  // Format distance for display
  formatDistance(distanceKm) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else {
      return `${distanceKm.toFixed(1)}km`;
    }
  }

  // Clean up resources
  cleanup() {
    this.stopWatchingLocation();
    this.locationSubscribers.clear();
  }
}

export default new LocationService();