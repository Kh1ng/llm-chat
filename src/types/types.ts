export type Auth = {
  type: "bearer" | "basic" | "custom";
  value: string;
  headerName?: string;
};

export type Profile = {
  name: string;
  address: string;
  models: string[];
  selectedModel?: string;
  auth?: Auth;
  macAddress?: string;
  broadcastAddress?: string;
  port?: number;
  bindAddress?: string;
};

export type ChatPageProps = {
  profile: {
    name: string;
    address: string;
    models: string[];
  };
  model: string;
};