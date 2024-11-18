import React from 'react';
import { Card, CardContent } from '../ui/card';
import { ArrowRight } from 'lucide-react';

const CategoryCard = ({ category }) => {
  const {
    name = "Category Name",
    icon = "/api/placeholder/100/100",
    itemCount = 0,
    color = "blue"
  } = category || {};

  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 hover:bg-blue-200",
    red: "bg-red-100 text-red-600 hover:bg-red-200",
    green: "bg-green-100 text-green-600 hover:bg-green-200",
    purple: "bg-purple-100 text-purple-600 hover:bg-purple-200"
  };

  return (
    <Card 
      className={`cursor-pointer transition-all ${colorClasses[color]}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={icon} 
              alt={name}
              className="w-12 h-12 object-contain"
            />
            <div>
              <h3 className="font-semibold text-lg">{name}</h3>
              <p className="text-sm opacity-75">{itemCount} items</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryCard;