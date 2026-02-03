import React from "react";

export function Select({ children, className = "", ...props }) {
  return (
    <div className={`inline-block ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SelectContent({ children, className = "", ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function SelectItem({ children, ...props }) {
  return <div {...props}>{children}</div>;
}

export function SelectTrigger({ children, ...props }) {
  return <button {...props}>{children}</button>;
}

export function SelectValue({ children, ...props }) {
  return <span {...props}>{children}</span>;
}
