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
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold leading-tight">{comparison.name}</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={deleteComparison}
            className="flex-1 sm:flex-none min-h-[44px] text-sm sm:text-base"
          >
            <span className="hidden sm:inline">Delete Comparison</span>
            <span className="sm:hidden">Delete</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 sm:flex-none min-h-[44px] text-sm sm:text-base"
          >
            Close
          </Button>
        </div>
      </div>

      {/* Desktop Table View (md and up) */}
      <div className="hidden md:block overflow-x-auto">
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

      {/* Mobile Card View (below md) */}
      <div className="md:hidden space-y-4">
        {deals.map((deal) => (
          <div key={deal.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b">
              <h3 className="font-semibold text-base line-clamp-2 flex-1">{deal.title}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeDeal(deal.id)}
                className="text-red-600 hover:text-red-800 min-w-[44px] min-h-[44px] flex-shrink-0"
              >
                Remove
              </Button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 font-medium">Store</span>
                <p className="text-gray-900">{deal.store}</p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Rating</span>
                <p className="text-gray-900">{deal.rating ? `${deal.rating}/5` : 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Original Price</span>
                <p className="text-gray-900">${deal.originalPrice?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Deal Price</span>
                <p className="text-green-600 font-semibold">${deal.dealPrice?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Discount</span>
                <p className="text-orange-600 font-semibold">{deal.discountPercentage ? `${deal.discountPercentage}%` : 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Savings</span>
                <p className="text-green-600 font-semibold">${deal.savings?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 font-medium">Categories</span>
                <p className="text-gray-900">{deal.categories?.join(', ') || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600 font-medium">Expires</span>
                <p className="text-gray-900">{deal.expiresAt ? new Date(deal.expiresAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              {deal.description && (
                <div className="col-span-2">
                  <span className="text-gray-600 font-medium">Description</span>
                  <p className="text-gray-900 text-sm line-clamp-3">{deal.description}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t space-y-2">
              <Button size="sm" className="w-full min-h-[44px]" asChild>
                <a href={deal.url} target="_blank" rel="noopener noreferrer">
                  View Deal
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full min-h-[44px]"
                onClick={() => window.open(deal.url, '_blank')}
              >
                Open in New Tab
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
        Comparing {deals.length} deal{deals.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default DealComparison;