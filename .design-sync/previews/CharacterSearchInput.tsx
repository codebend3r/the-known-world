import { useState } from "react";
import { CharacterSearchInput } from "the-known-world";

// CharacterSearchInput has two modes behind a discriminated union:
//   - filter mode (autocomplete omitted/false): fully controlled `value` + `onChange`.
//   - autocomplete mode (autocomplete: true): owns its own query, fetches the
//     character roll from /search-index/characters.json on first hover or
//     focus, and navigates on select via next/navigation (stubbed here).
export const Filter = () => {
  const [value, setValue] = useState("Stark");
  return (
    <div style={{ maxWidth: "28rem" }}>
      <CharacterSearchInput
        value={value}
        onChange={setValue}
        placeholder="Search characters…"
        ariaLabel="Filter characters"
      />
    </div>
  );
};

export const Autocomplete = () => (
  <div style={{ maxWidth: "28rem" }}>
    <CharacterSearchInput
      autocomplete
      placeholder="Search characters…"
      ariaLabel="Search characters"
    />
  </div>
);
