import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Laptop, 
  Home, 
  Shirt, 
  Watch, 
  Gamepad2, 
  BookOpen, 
  Baby,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CategoryNav = ({ onCategoryChange, selectedCategory: externalCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState(externalCategory || 'all');

  React.useEffect(() => {
    if (externalCategory !== undefined) {
      setSelectedCategory(externalCategory);
    }
  }, [externalCategory]);

  const categories = [
    { id: 'all', name: 'All Deals', icon: null },
    { id: 'electronics', name: 'Electronics', icon: Smartphone },
    { id: 'computers', name: 'Computers', icon: Laptop },
    { id: 'home', name: 'Home & Kitchen', icon: Home },
    { id: 'fashion', name: 'Fashion', icon: Shirt },
    { id: 'watches', name: 'Watches', icon: Watch },
    { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
    { id: 'books', name: 'Books', icon: BookOpen },
    { id: 'baby', name: 'Baby & Kids', icon: Baby },
  ];

  return (
    <section className="bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hidden md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    if (onCategoryChange) {
                      onCategoryChange(category.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{category.name}</span>
                </motion.button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hidden md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CategoryNav;