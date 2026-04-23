import React from 'react';

const FormAlert = ({ message, theme = 'light' }: { message: string; theme?: 'light' | 'dark' }) => {
  if (!message) return null;
  return (
    <div className={`text-sm px-3 py-2 rounded-lg ${
      theme === 'dark' 
        ? 'bg-red-900/30 text-red-300 border border-red-800' 
        : 'bg-red-50 text-red-600 border border-red-200'
    }`}>
      {message}
    </div>
  );
};

export default FormAlert;
