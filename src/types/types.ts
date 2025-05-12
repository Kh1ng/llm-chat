export type Profile = {
  name: string;
  address: string;
  models: string[];
  selectedModel?: string;
  auth?: {
    type: "bearer" | "basic" | "custom";
    value: string;
    headerName?: string; // for custom headers
  };
};