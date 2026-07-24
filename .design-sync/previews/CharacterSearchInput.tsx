import { useState } from "react";
import { CharacterSearchInput } from "game-of-thrones-atlas";

// CharacterSearchInput has two modes behind a discriminated union:
//   - filter mode (autocomplete omitted/false): fully controlled `value` + `onChange`.
//   - autocomplete mode (autocomplete: true): owns its own query, ranks `items`,
//     and navigates on select via next/navigation (stubbed here).
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
      items={[
        {
          slug: "jon-snow",
          name: "Jon Snow",
          alias: "The White Wolf",
          aliases: ["The White Wolf", "Lord Snow", "Aegon Targaryen"],
        },
        {
          slug: "daenerys-targaryen",
          name: "Daenerys Targaryen",
          alias: "The Mother of Dragons",
          aliases: ["Dany", "Khaleesi", "The Unburnt"],
        },
        {
          slug: "tyrion-lannister",
          name: "Tyrion Lannister",
          alias: "The Imp",
          aliases: ["The Imp", "Halfman"],
        },
        {
          slug: "brienne-of-tarth",
          name: "Brienne of Tarth",
          alias: "The Maid of Tarth",
          aliases: ["Brienne the Beauty"],
        },
        {
          slug: "sandor-clegane",
          name: "Sandor Clegane",
          alias: "The Hound",
          aliases: ["The Hound"],
        },
      ]}
    />
  </div>
);
