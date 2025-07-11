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
  port: number; // LLM server port, not WoL
  bindAddress?: string;
};

export type ChatPageProps = {
  profile: {
    name: string;
    address: string;
  };
  model: string;
};

export type LandingPageProps = {
  // eslint-disable-next-line no-unused-vars
  onOpenChat: (profile: Profile, model: string) => void;
};

export type ProfileCardProps = {
  profile: Profile;
  selectedModel: string;
  // eslint-disable-next-line no-unused-vars
  onSelectModel: (model: string) => void;
  onRemove: () => void;
  onOpenChat: () => void;
  onClick: () => void;
  isActive: boolean;
  onRefreshModels: () => void;
  onEdit?: (profile: Profile) => void;
};

