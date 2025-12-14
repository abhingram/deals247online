import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DealComparison from '../components/DealComparison';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';

const DealComparisonPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [comparisons, setComparisons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadComparisons();
  }, []);

  const loadComparisons = async () => {
    try {
      const comps = await api.getComparisons();
      setComparisons(comps);
    } catch (error) {
      console.error('Failed to load comparisons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewComparison = async () => {
    const name = prompt('Enter a name for your comparison:');
    if (!name) return;

    try {
      const newComparison = await api.createComparison({
        name,
        dealIds: [],
        createdAt: new Date().toISOString()
      });

      setComparisons(prev => [...prev, newComparison]);
      navigate(`/comparison/${newComparison.id}`);

      toast({
        title: "Comparison created",
        description: "Your new comparison has been created.",
      });
    } catch (error) {
      console.error('Failed to create comparison:', error);
      toast({
        title: "Creation failed",
        description: "Failed to create new comparison.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    navigate('/comparisons');
  };

  if (id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <DealComparison comparisonId={id} onClose={handleClose} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 leading-tight">Deal Comparisons</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Compare deals side by side to find the best value
            </p>
          </div>
          <Button 
            onClick={createNewComparison}
            className="min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
          >
            <span className="hidden sm:inline">Create New Comparison</span>
            <span className="sm:hidden">Create Comparison</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-base sm:text-lg">Loading comparisons...</div>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="text-5xl sm:text-6xl mb-4">⚖️</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              No Comparisons Yet
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Create your first comparison to start comparing deals
            </p>
            <Button 
              onClick={createNewComparison}
              className="min-h-[44px] text-sm sm:text-base"
            >
              Create Your First Comparison
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {comparisons.map((comparison) => (
              <div
                key={comparison.id}
                className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/comparison/${comparison.id}`)}
              >
                <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 line-clamp-2">{comparison.name}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  {comparison.dealIds?.length || 0} deal{comparison.dealIds?.length !== 1 ? 's' : ''} compared
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Created: {new Date(comparison.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DealComparisonPage;