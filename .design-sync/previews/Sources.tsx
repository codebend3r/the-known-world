import { Sources } from "game-of-thrones-atlas";

// The citation footer shown at the bottom of every atlas entry. AWOIAF
// sources render as licensed links; other types render as plain refs.
export const Default = () => (
  <Sources
    sources={[
      {
        type: "awoiaf",
        url: "https://awoiaf.westeros.org/index.php/House_Stark",
        license: "CC-BY-SA-4.0",
      },
      { type: "book", ref: "A Game of Thrones, Chapter 1 (Bran I)" },
      { type: "show", ref: 'Game of Thrones, S1E1 "Winter Is Coming"' },
    ]}
  />
);
