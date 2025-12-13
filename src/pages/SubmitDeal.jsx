import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Upload, X } from 'lucide-react';

const SubmitDeal = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    store: '',
    original_price: '',
    discounted_price: '',
    discount: '',
    category: '',
    image: '',
    expires_at: '',
    verified: false
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Load categories and stores
    const loadData = async () => {
      try {
        const [categoriesData, storesData] = await Promise.all([
          api.getCategories(),
          api.getStores()
        ]);
        console.log('Categories loaded:', categoriesData);
        console.log('Stores loaded:', storesData);
        setCategories(categoriesData);
        setStores(storesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form data. Please try again.',
          variant: 'destructive'
        });
      }
    };

    loadData();
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-calculate discount if prices change
    if (name === 'original_price' || name === 'discounted_price') {
      const original = name === 'original_price' ? parseFloat(value) : parseFloat(formData.original_price);
      const discounted = name === 'discounted_price' ? parseFloat(value) : parseFloat(formData.discounted_price);

      if (original > 0 && discounted > 0 && discounted < original) {
        const discount = Math.round(((original - discounted) / original) * 100);
        setFormData(prev => ({
          ...prev,
          discount: discount.toString()
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a deal title.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.store) {
      toast({
        title: 'Validation Error',
        description: 'Please select a store.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: 'Validation Error',
        description: 'Please select a category.',
        variant: 'destructive'
      });
      return;
    }

    const originalPrice = parseFloat(formData.original_price);
    const discountedPrice = parseFloat(formData.discounted_price);

    if (!originalPrice || originalPrice <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid original price.',
        variant: 'destructive'
      });
      return;
    }

    if (!discountedPrice || discountedPrice <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid discounted price.',
        variant: 'destructive'
      });
      return;
    }

    if (discountedPrice >= originalPrice) {
      toast({
        title: 'Validation Error',
        description: 'Discounted price must be less than original price.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const dealData = {
        ...formData,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount: parseInt(formData.discount) || 0,
        rating: 0,
        reviews: 0,
        verified: false // New deals start as unverified
      };

      await api.createDeal(dealData);

      toast({
        title: 'Success!',
        description: 'Your deal has been submitted and is pending review.',
      });

      // Reset form
      setFormData({
        title: '',
        store: '',
        original_price: '',
        discounted_price: '',
        discount: '',
        category: '',
        image: '',
        expires_at: '',
        verified: false
      });

      // Navigate back to home after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Error submitting deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit deal. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit a Deal</h1>
          <p className="text-gray-600">
            Share amazing deals you've found. All submissions are reviewed before being published.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
            <CardDescription>
              Fill in the details about the deal you want to share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Deal Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="e.g., Apple iPhone 15 Pro Max - 256GB"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="store">Store *</Label>
                  <select
                    id="store"
                    name="store"
                    value={formData.store}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    disabled={stores.length === 0}
                  >
                    <option value="">
                      {stores.length === 0 ? 'Loading stores...' : 'Select a store'}
                    </option>
                    {stores.map(store => (
                      <option key={store.id} value={store.name}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  {stores.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Loading available stores...</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    disabled={categories.length === 0}
                  >
                    <option value="">
                      {categories.length === 0 ? 'Loading categories...' : 'Select a category'}
                    </option>
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Loading available categories...</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="original_price">Original Price ($) *</Label>
                  <Input
                    id="original_price"
                    name="original_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.original_price}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="discounted_price">Discounted Price ($) *</Label>
                  <Input
                    id="discounted_price"
                    name="discounted_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.discounted_price}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    name="discount"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Auto-calculated"
                    value={formData.discount}
                    onChange={handleInputChange}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically calculated from prices
                  </p>
                </div>

                <div>
                  <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
                  <Input
                    id="expires_at"
                    name="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="image">Image URL (Optional)</Label>
                  <Input
                    id="image"
                    name="image"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.image}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide a direct link to the product image
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700"
                >
                  {loading ? 'Submitting...' : 'Submit Deal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitDeal;