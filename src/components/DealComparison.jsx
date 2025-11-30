import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

const DealComparison = ({ comparisonId, onClose }) => {
  const { toast } = useToast();
  const [comparison, setComparison] = useState(null);
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (comparisonId) {
      loadComparison(comparisonId);
    }
  }, [comparisonId]);

  const loadComparison = async (id) => {
    try {
      const comp = await api.getComparison(id);
      setComparison(comp);

      // Load deal details for each deal in the comparison
      const dealPromises = comp.dealIds.map(dealId => api.getDeal(dealId));
      const dealDetails = await Promise.all(dealPromises);
      setDeals(dealDetails);
    } catch (error) {
      console.error('Failed to load comparison:', error);
      toast({
        title: "Load failed",
        description: "Failed to load comparison. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeDeal = async (dealId) => {
    if (!comparison) return;

    try {
      const updatedDealIds = comparison.dealIds.filter(id => id !== dealId);
      await api.updateComparison(comparison.id, {
        ...comparison,
        dealIds: updatedDealIds
      });

      setComparison(prev => ({ ...prev, dealIds: updatedDealIds }));
      setDeals(prev => prev.filter(deal => deal.id !== dealId));

      toast({
        title: "Deal removed",
        description: "Deal has been removed from comparison.",
      });
    } catch (error) {
      console.error('Failed to remove deal:', error);
      toast({
        title: "Remove failed",
        description: "Failed to remove deal from comparison.",
        variant: "destructive",
      });
    }
  };

  const addDealToComparison = async (dealId) => {
    if (!comparison) return;

    if (comparison.dealIds.includes(dealId)) {
      toast({
        title: "Already added",
        description: "This deal is already in the comparison.",
      });
      return;
    }

    try {
      const updatedDealIds = [...comparison.dealIds, dealId];
      await api.updateComparison(comparison.id, {
        ...comparison,
        dealIds: updatedDealIds
      });

      setComparison(prev => ({ ...prev, dealIds: updatedDealIds }));

      // Load the new deal details
      const newDeal = await api.getDeal(dealId);
      setDeals(prev => [...prev, newDeal]);

      toast({
        title: "Deal added",
        description: "Deal has been added to comparison.",
      });
    } catch (error) {
      console.error('Failed to add deal:', error);
      toast({
        title: "Add failed",
        description: "Failed to add deal to comparison.",
        variant: "destructive",
      });
    }
  };

  const deleteComparison = async () => {
    if (!comparison) return;

    if (!confirm('Are you sure you want to delete this comparison?')) return;

    try {
      await api.deleteComparison(comparison.id);
      toast({
        title: "Comparison deleted",
        description: "Comparison has been deleted.",
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete comparison:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete comparison.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading comparison...</div>
      </div>
    );
  }

  if (!comparison || deals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No deals to compare</p>
        <Button onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{comparison.name}</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={deleteComparison}>
            Delete Comparison
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-4 text-left">Deal Details</th>
              {deals.map((deal, index) => (
                <th key={deal.id} className="border border-gray-300 p-4 text-center min-w-[200px]">
                  <div className="space-y-2">
                    <div className="font-semibold">{deal.title}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDeal(deal.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-4 font-medium">Store</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center">
                  {deal.store}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 p-4 font-medium">Original Price</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center">
                  ${deal.originalPrice?.toFixed(2) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-4 font-medium">Deal Price</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center font-semibold text-green-600">
                  ${deal.dealPrice?.toFixed(2) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 p-4 font-medium">Discount</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center">
                  {deal.discountPercentage ? `${deal.discountPercentage}%` : 'N/A'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-4 font-medium">Savings</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center text-green-600 font-semibold">
                  ${deal.savings?.toFixed(2) || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 p-4 font-medium">Rating</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center">
                  {deal.rating ? `${deal.rating}/5` : 'N/A'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-4 font-medium">Categories</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center">
                  {deal.categories?.join(', ') || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 p-4 font-medium">Expires</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center">
                  {deal.expiresAt ? new Date(deal.expiresAt).toLocaleDateString() : 'N/A'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-4 font-medium">Description</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center text-sm">
                  {deal.description || 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 p-4 font-medium">Actions</td>
              {deals.map(deal => (
                <td key={deal.id} className="border border-gray-300 p-4 text-center">
                  <div className="space-y-2">
                    <Button size="sm" asChild>
                      <a href={deal.url} target="_blank" rel="noopener noreferrer">
                        View Deal
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(deal.url, '_blank')}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        Comparing {deals.length} deal{deals.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default DealComparison;