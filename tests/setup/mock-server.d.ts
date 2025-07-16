declare module "../../tests/setup/mock-server.cjs" {
  export function startTestServer(): Promise<{ url: string }>;
  export function stopTestServer(): Promise<void>;
}

export function startTestServer(): Promise<{ url: string }> {
  return Promise.resolve({ url: "http://localhost:11434" });
}

export function stopTestServer(): Promise<void> {
  return Promise.resolve();
}
