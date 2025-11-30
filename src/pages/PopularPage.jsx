import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DealsGrid from '@/components/DealsGrid';
import { Helmet } from 'react-helmet';

const PopularPage = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const handleSearch = (query) => {
    console.log('PopularPage received search query:', query);
    setSearchQuery(query);
  };

  const handleCategoryChange = (category) => {
    console.log('PopularPage received category change:', category);
    setSelectedCategory(category);
  };

  return (
    <>
      <Helmet>
        <title>Popular Deals - Deals247 | Most Clicked & Viewed Deals</title>
        <meta name="description" content="Check out the most popular deals that everyone is clicking on. Find trending deals and what's hot right now with Deals247." />
      </Helmet>
      <Header onSearch={handleSearch} />
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">⭐ Popular Deals</h1>
          <p className="text-xl">The most clicked and viewed deals by our community</p>
        </div>
      </div>
      <DealsGrid
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        filterType="popular"
      />
      <Footer />
    </>
  );
};

export default PopularPage;