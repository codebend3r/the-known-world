// Bun's test runner has no equivalent of Vitest's `vi.stubGlobal`/`vi.stubEnv`,
// so these record the original on first stub and put it back on unstub.

type PropertyStub = {
  target: object;
  key: PropertyKey;
  original: PropertyDescriptor | undefined;
};

const propertyStubs: PropertyStub[] = [];
const envStubs = new Map<string, string | undefined>();

export function stubProperty({
  target,
  key,
  descriptor,
}: {
  target: object;
  key: PropertyKey;
  descriptor: PropertyDescriptor;
}): void {
  const isStubbed = propertyStubs.some(
    (stub) => stub.target === target && stub.key === key,
  );
  if (!isStubbed) {
    propertyStubs.push({
      target,
      key,
      original: Object.getOwnPropertyDescriptor(target, key),
    });
  }
  Object.defineProperty(target, key, { ...descriptor, configurable: true });
}

export function stubGlobal({
  name,
  value,
}: {
  name: string;
  value: unknown;
}): void {
  stubProperty({
    target: globalThis,
    key: name,
    descriptor: { value, writable: true },
  });
}

/** Puts back everything `stubProperty` and `stubGlobal` replaced. */
export function unstubAllProperties(): void {
  propertyStubs.forEach(({ target, key, original }) => {
    if (original) {
      Object.defineProperty(target, key, original);
      return;
    }
    Reflect.deleteProperty(target, key);
  });
  propertyStubs.length = 0;
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
