import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import CategoryNav from '@/components/CategoryNav';
import DealsGrid from '@/components/DealsGrid';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet';

const Home = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const handleSearch = (query) => {
    console.log('Home received search query:', query);
    setSearchQuery(query);
  };

  const handleCategoryChange = (category) => {
    console.log('Home received category change:', category);
    setSelectedCategory(category);
  };

  return (
    <>
      <Helmet>
        <title>New Deals - Deals247 | Latest & Fresh Deals</title>
        <meta name="description" content="Discover the newest and latest deals on Deals247. Find fresh deals and offers that were just added to our platform." />
      </Helmet>
      <Header onSearch={handleSearch} />
      <HeroSection />
      <CategoryNav 
        onCategoryChange={handleCategoryChange} 
        selectedCategory={selectedCategory}
      />
      <DealsGrid 
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
      />
      <Footer />
    </>
  );
};

export default Home;
