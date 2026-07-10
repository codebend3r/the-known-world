import type { ReactSVGPanZoom } from "react-svg-pan-zoom";

declare module "react-svg-pan-zoom" {
  // The runtime `UncontrolledReactSVGPanZoom` assigns its inner viewer to a
  // public `Viewer` field, which `@types/react-svg-pan-zoom` omits. The
  // wrapper's own declared `getValue()`/`setValue()` do not exist at
  // runtime; the inner viewer's do.
  interface UncontrolledReactSVGPanZoom {
    Viewer: ReactSVGPanZoom | null;
  }
}
