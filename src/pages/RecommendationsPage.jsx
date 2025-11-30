import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Recommendations from '../components/Recommendations';

const RecommendationsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Recommendations</h1>
          <p className="text-gray-600">
            Personalized deals based on your browsing history and preferences
          </p>
        </div>

        <Recommendations limit={12} />
      </main>

      <Footer />
    </div>
  );
};

export default RecommendationsPage;