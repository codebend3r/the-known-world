// Bun's test runner has no equivalent of Vitest's `vi.stubGlobal`/`vi.stubEnv`,
// so these record the original value on first stub and put it back on unstub.

type GlobalStub = { existed: boolean; value: unknown };

const globalStubs = new Map<string, GlobalStub>();
const envStubs = new Map<string, string | undefined>();

export function stubGlobal({
  name,
  value,
}: {
  name: string;
  value: unknown;
}): void {
  if (!globalStubs.has(name)) {
    globalStubs.set(name, {
      existed: name in globalThis,
      value: Reflect.get(globalThis, name),
    });
  }
  Reflect.set(globalThis, name, value);
}

export function unstubAllGlobals(): void {
  globalStubs.forEach(({ existed, value }, name) => {
    if (existed) {
      Reflect.set(globalThis, name, value);
    } else {
      Reflect.deleteProperty(globalThis, name);
    }
  });
  globalStubs.clear();
}

export function stubEnv({
  name,
  value,
}: {
  name: string;
  value: string;
}): void {
  if (!envStubs.has(name)) envStubs.set(name, process.env[name]);
  process.env[name] = value;
}

export function unstubAllEnvs(): void {
  envStubs.forEach((value, name) => {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  });
  envStubs.clear();
}
