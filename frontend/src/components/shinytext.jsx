import React from "react";

export default function ShinyText({ text, className = "" }) {
  return (
    <span
      className={`inline-block bg-linear-to-r from-neutral-200 via-white to-neutral-400 bg-clip-text text-transparent drop-shadow-sm font-extrabold ${className}`}
    >
      {text}
    </span>
  );
}