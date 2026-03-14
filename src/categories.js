// src/categories.js

export const DEFAULT_CATEGORIES = [
  { name: 'Jobs', color: '#2196f3' },
  { name: 'Promotions', color: '#f44336' },
  { name: 'Friends', color: '#4caf50' },
  { name: 'Finance', color: '#ffeb3b' },
  { name: 'Travel', color: '#009688' },
  { name: 'Social Media', color: '#ff9800' },
  { name: 'Newsletters', color: '#9c27b0' },
  { name: 'Other', color: '#9e9e9e' },
];

const OTHER_CATEGORY = { name: 'Other', color: '#9e9e9e' };

export function validateCategories(categories) {
  const hasOther = categories.some(c => c.name === 'Other');
  if (hasOther) return [...categories];
  return [...categories, OTHER_CATEGORY];
}
