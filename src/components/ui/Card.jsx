import React from "react";

export default function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-white border border-neutral-200 shadow-sm p-4 gaia-force-text ${className}`}
    >
      {children}
    </div>
  );
}