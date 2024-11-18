import React, { useState } from 'react';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { SlidersHorizontal } from 'lucide-react';

const Filter = ({ onFilterChange }) => {
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [categories, setCategories] = useState({
    regular: true,
    emergency: true,
    prescription: true,
    otc: true,
  });

  const [availability, setAvailability] = useState({
    inStock: true,
    outOfStock: false,
  });

  const handlePriceChange = (value) => {
    setPriceRange(value);
    applyFilters();
  };

  const handleCategoryChange = (category) => {
    setCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
    applyFilters();
  };

  const applyFilters = () => {
    onFilterChange?.({
      priceRange,
      categories,
      availability,
    });
  };

  const resetFilters = () => {
    setPriceRange([0, 1000]);
    setCategories({
      regular: true,
      emergency: true,
      prescription: true,
      otc: true,
    });
    setAvailability({
      inStock: true,
      outOfStock: false,
    });
    applyFilters();
  };

  return (
    <div className="w-full max-w-xs p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          Filters
        </h3>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Reset
        </Button>
      </div>

      <div className="space-y-6">
        {/* Price Range */}
        <div>
          <h4 className="text-sm font-medium mb-2">Price Range</h4>
          <Slider
            defaultValue={priceRange}
            max={1000}
            step={10}
            onValueChange={handlePriceChange}
            className="mb-2"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h4 className="text-sm font-medium mb-2">Categories</h4>
          <div className="space-y-2">
            {Object.entries(categories).map(([category, checked]) => (
              <div key={category} className="flex items-center">
                <Checkbox
                  id={category}
                  checked={checked}
                  onCheckedChange={() => handleCategoryChange(category)}
                />
                <label
                  htmlFor={category}
                  className="ml-2 text-sm font-medium capitalize"
                >
                  {category}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <h4 className="text-sm font-medium mb-2">Availability</h4>
          <div className="space-y-2">
            {Object.entries(availability).map(([status, checked]) => (
              <div key={status} className="flex items-center">
                <Checkbox
                  id={status}
                  checked={checked}
                  onCheckedChange={() => {
                    setAvailability(prev => ({
                      ...prev,
                      [status]: !prev[status]
                    }));
                    applyFilters();
                  }}
                />
                <label
                  htmlFor={status}
                  className="ml-2 text-sm font-medium capitalize"
                >
                  {status === 'inStock' ? 'In Stock' : 'Out of Stock'}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filter;