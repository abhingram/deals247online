import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DealDetailScreen({ route, navigation }) {
  const { deal } = route.params;

  const handleOpenDeal = () => {
    Linking.openURL(deal.url).catch(() => {
      Alert.alert('Error', 'Unable to open deal link');
    });
  };

  const handleShare = () => {
    // Implement share functionality
    Alert.alert('Share', 'Share functionality coming soon!');
  };

  const handleAddToFavorites = () => {
    // Implement add to favorites functionality
    Alert.alert('Added to Favorites', `${deal.title} has been added to your favorites!`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <Image source={{ uri: deal.image }} style={styles.dealImage} />

      <View style={styles.content}>
        <Text style={styles.title}>{deal.title}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.currentPrice}>${deal.price}</Text>
          <Text style={styles.originalPrice}>${deal.originalPrice}</Text>
          <Text style={styles.discount}>{deal.discount}% OFF</Text>
        </View>

        <View style={styles.storeContainer}>
          <Text style={styles.storeLabel}>Store:</Text>
          <Text style={styles.storeName}>{deal.store}</Text>
        </View>

        {deal.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{deal.description}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleAddToFavorites}
          >
            <Ionicons name="heart-outline" size={20} color="#007bff" />
            <Text style={styles.favoriteText}>Add to Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dealButton}
            onPress={handleOpenDeal}
          >
            <Text style={styles.dealButtonText}>Get Deal</Text>
            <Ionicons name="open-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {deal.expiresAt && (
          <View style={styles.expiryContainer}>
            <Ionicons name="time-outline" size={16} color="#e74c3c" />
            <Text style={styles.expiryText}>
              Expires: {new Date(deal.expiresAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  shareButton: {
    padding: 5,
  },
  dealImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  content: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    lineHeight: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
    marginRight: 10,
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    color: '#999',
    marginRight: 10,
  },
  discount: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: 'bold',
    backgroundColor: '#ffeaea',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  storeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  storeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  storeName: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  favoriteText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  dealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dealButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  expiryText: {
    color: '#e74c3c',
    fontSize: 14,
    marginLeft: 5,
  },
});