import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DealsGrid from '@/components/DealsGrid';
import { Helmet } from 'react-helmet';

const HotPage = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const handleSearch = (query) => {
    console.log('HotPage received search query:', query);
    setSearchQuery(query);
  };

  const handleCategoryChange = (category) => {
    console.log('HotPage received category change:', category);
    setSelectedCategory(category);
  };

  return (
    <>
      <Helmet>
        <title>Hot Deals - Deals247 | Massive Discounts Over 50% Off</title>
        <meta name="description" content="Discover the hottest deals with massive discounts over 50% off. Find the best deals on products across various categories with Deals247." />
      </Helmet>
      <Header onSearch={handleSearch} />
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">🔥 Hot Deals</h1>
          <p className="text-xl">Massive discounts over 50% off - Don't miss out!</p>
        </div>
      </div>
      <DealsGrid
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        filterType="hot"
      />
      <Footer />
    </>
  );
};

export default HotPage;