import React from "react";

const Select = React.forwardRef(({ children, ...props }, ref) => {
  return <select ref={ref} className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-950" {...props}>{children}</select>;
});

const SelectTrigger = ({ children, ...props }) => {
  return <div className="relative">{children}</div>;
};

const SelectValue = ({ children }) => {
  return <span>{children}</span>;
};

const SelectContent = ({ children }) => {
  return children;
};

const SelectItem = ({ value, children }) => {
  return <option value={value}>{children}</option>;
};

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };