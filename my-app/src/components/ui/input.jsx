import React from "react";

export function Input(props) {
  return <input className={`rounded-md border px-3 py-2 ${props.className || ""}`} {...props} />;
}
