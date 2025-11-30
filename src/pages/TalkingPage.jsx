import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DealsGrid from '@/components/DealsGrid';
import { Helmet } from 'react-helmet';

const TalkingPage = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const handleSearch = (query) => {
    console.log('TalkingPage received search query:', query);
    setSearchQuery(query);
  };

  const handleCategoryChange = (category) => {
    console.log('TalkingPage received category change:', category);
    setSelectedCategory(category);
  };

  return (
    <>
      <Helmet>
        <title>Talking Deals - Deals247 | Deals with Community Comments</title>
        <meta name="description" content="Discover deals that are generating buzz in our community. See what people are talking about and find deals with comments and discussions." />
      </Helmet>
      <Header onSearch={handleSearch} />
      <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">💬 Talking Deals</h1>
          <p className="text-xl">Deals that are generating buzz in our community</p>
        </div>
      </div>
      <DealsGrid
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        filterType="talking"
      />
      <Footer />
    </>
  );
};

export default TalkingPage;