import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api'; // Update with your actual API URL

export default function DealsScreen({ navigation }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchDeals();
    fetchCategories();
  }, [selectedCategory]);

  const fetchDeals = async () => {
    try {
      const url = selectedCategory === 'all'
        ? `${API_BASE_URL}/deals`
        : `${API_BASE_URL}/deals?category=${selectedCategory}`;

      const response = await axios.get(url);
      setDeals(response.data);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories`);
      setCategories([{ id: 'all', name: 'All' }, ...response.data]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals();
  };

  const renderDealItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dealCard}
      onPress={() => navigation.navigate('DealDetail', { deal: item })}
    >
      <Image source={{ uri: item.image }} style={styles.dealImage} />
      <View style={styles.dealInfo}>
        <Text style={styles.dealTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.dealPrice}>${item.price}</Text>
        <Text style={styles.dealOriginalPrice}>${item.originalPrice}</Text>
        <Text style={styles.dealDiscount}>{item.discount}% OFF</Text>
        <Text style={styles.dealStore}>{item.store}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.id && styles.selectedCategoryButton
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.selectedCategoryText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hot Deals</Text>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
      />

      <FlatList
        data={deals}
        renderItem={renderDealItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.dealsGrid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryList: {
    maxHeight: 50,
    backgroundColor: '#fff',
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryButton: {
    backgroundColor: '#007bff',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  dealsGrid: {
    padding: 10,
  },
  dealCard: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dealImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  dealInfo: {
    padding: 10,
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  dealPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  dealOriginalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#999',
  },
  dealDiscount: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  dealStore: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});