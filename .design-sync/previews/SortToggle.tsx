import { useState } from "react";
import { SortToggle } from "game-of-thrones-atlas";

// SortToggle is a controlled A-Z / Z-A segmented control.
// The consumer owns `value` and reacts to `onChange`. Each cell seeds
// local state to a different direction so the pressed styling is visible.
export const Ascending = () => {
  const [value, setValue] = useState("asc");
  return <SortToggle value={value} onChange={setValue} />;
};

export const Descending = () => {
  const [value, setValue] = useState("desc");
  return <SortToggle value={value} onChange={setValue} />;
};
