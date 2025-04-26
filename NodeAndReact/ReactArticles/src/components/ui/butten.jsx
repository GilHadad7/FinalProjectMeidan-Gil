import React from "react";

export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-md bg-[#c9b7a3] text-black font-semibold hover:bg-[#b6a48e] transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
