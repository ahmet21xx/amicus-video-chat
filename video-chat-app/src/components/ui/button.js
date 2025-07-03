// src/components/ui/button.js
import React from 'react';

export function Button({ children, onClick, variant = "default" }) {
  const base = "px-4 py-2 rounded font-semibold ";
  const styles = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button onClick={onClick} className={base + (styles[variant] || styles.default)}>
      {children}
    </button>
  );
}
