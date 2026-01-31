import React from "react";

export default function Card({ children, className = "", style = {}, ...rest }) {
  return (
    <div
      {...rest}
      className={`gaia-card ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
