import React from 'react';

// Utility function for combining class names
const classNames = (...classes) => classes.filter(Boolean).join(' ');

// Tabs Component
export const Tabs = ({ tabs, defaultTab, className = '' }) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  return (
    <div className={classNames('w-full', className)}>
      {/* Tab Navigation */}
      <div className="border-b flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={classNames(
              'px-4 py-2 text-sm font-medium transition-colors',
              'hover:text-gray-900 hover:bg-gray-50',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
              activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={classNames(
              'transition-opacity duration-200',
              activeTab === tab.id ? 'block' : 'hidden'
            )}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

// TabsList Component
export const TabsList = ({ children, className }) => (
  <div className={classNames('border-b flex', className)}>{children}</div>
);

// TabsTrigger Component
export const TabsTrigger = ({ isActive, onClick, children, className }) => (
  <button
    onClick={onClick}
    className={classNames(
      'px-4 py-2 text-sm font-medium transition-colors',
      'hover:text-gray-900 hover:bg-gray-50',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      isActive ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500',
      className
    )}
  >
    {children}
  </button>
);

// TabsContent Component
export const TabsContent = ({ isActive, children, className }) => (
  <div
    className={classNames(
      'transition-opacity duration-200',
      isActive ? 'block' : 'hidden',
      className
    )}
  >
    {children}
  </div>
);

// Default Export
export default Tabs;
