import React from "react";

export function Button({ children, variant, size, className = "", ...props }) {
  const base = "inline-flex items-center gap-2 rounded-md px-3 py-2";
  const cls = `${base} ${className}`.trim();
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
