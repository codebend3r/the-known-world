import "react";

// Iron Throne passes heraldic colour into components as a custom property
// (`--house-tint`, `--sigil-metal`, ...) so the module keeps the token and the
// component only names which house it is. React's `CSSProperties` has no index
// signature for custom properties, which would otherwise force a cast at every
// call site; widening it here keeps those assignments type-checked instead.
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
