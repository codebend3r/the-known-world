import { plugin } from "bun";
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Mirror `trailingSlash: true` from next.config.ts so next/link keeps trailing
// slashes in DOM tests. __NEXT_TRAILING_SLASH is an internal Next.js variable;
// see node_modules/next/dist/esm/build/define-env.js — it may be renamed in a
// future Next release.
process.env.__NEXT_TRAILING_SLASH = "1";

GlobalRegistrator.register({ url: "http://localhost/" });

// Bun has no CSS-module loader, so `styles.foo` resolves to the literal 'foo'.
// This matches Vitest's `classNameStrategy: "non-scoped"`, keeping class-string
// assertions readable without coupling them to a bundler's hash format.
plugin({
  name: "css-modules",
  setup(build) {
    build.onLoad({ filter: /\.s?css$/ }, () => ({
      loader: "js",
      contents:
        "export default new Proxy({}, { get: (_target, key) => (typeof key === 'string' ? key : undefined) });",
    }));
  },
});

// jsdom shipped no `window.matchMedia`, and components read that absence in
// opposite directions — FamilyTreeChart treats it as "prefers reduced motion"
// and applies transforms instantly, TimelineMinimap treats it as no preference
// and scrolls smoothly. happy-dom does implement it, which flips one of them
// either way it answers. Leaving it undefined keeps both behaviors as written;
// tests that need a real answer stub `matchMedia` themselves.
Object.defineProperty(window, "matchMedia", {
  value: undefined,
  configurable: true,
  writable: true,
});

// happy-dom's `WheelEvent` extends `UIEvent` rather than `MouseEvent`, so the
// pointer and modifier fields of the init dict are silently dropped. Components
// here branch on them (ctrl+wheel is a trackpad pinch; clientX/clientY anchor
// the zoom), so carry them onto the instance.
const BaseWheelEvent = window.WheelEvent;

window.WheelEvent = class extends BaseWheelEvent {
  constructor(type: string, init: WheelEventInit = {}) {
    super(type, init);
    const mouseFields = {
      clientX: init.clientX ?? 0,
      clientY: init.clientY ?? 0,
      screenX: init.screenX ?? 0,
      screenY: init.screenY ?? 0,
      button: init.button ?? 0,
      buttons: init.buttons ?? 0,
      ctrlKey: init.ctrlKey ?? false,
      shiftKey: init.shiftKey ?? false,
      altKey: init.altKey ?? false,
      metaKey: init.metaKey ?? false,
    };
    Object.entries(mouseFields).forEach(([name, value]) => {
      Object.defineProperty(this, name, { value, configurable: true });
    });
  }
};

// Testing Library registers its own auto-cleanup when it is first imported,
// which only covers the file that imported it. Registering from the preload
// unmounts between tests in every file, so no test inherits a mounted DOM.
const { cleanup } = await import("@testing-library/react");
afterEach(cleanup);
