import ProfileCard from "../components/ProfileCard";
import { useEffect, useState } from "react";
import { loadProfiles, saveProfiles } from "../store/profileStore";
import { Profile } from "../types/types";
import { LandingPageProps } from "../types/types";
import { invoke } from "@tauri-apps/api/core";

export default function LandingPage({ onOpenChat }: LandingPageProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [activeProfileName, setActiveProfileName] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadProfiles().then((data) => {
      setProfiles(data);
      if (data.length > 0 && data[0].models.length > 0) {
        setSelectedModel(data[0].models[0]);
      }
    });
  }, []);

  async function refreshModels(profile: Profile) {
    try {
      const modelsJson: any = await invoke("get_models", {
        llmAddress: profile.address,
      });
      let parsedModels =
        typeof modelsJson === "string" ? JSON.parse(modelsJson) : modelsJson;
      const modelNames = Array.isArray(parsedModels.models)
        ? parsedModels.models.map((m: any) => m.name)
        : [];
      const updatedProfiles = profiles.map((p) =>
        p.name === profile.name ? { ...p, models: modelNames } : p
      );
      setProfiles(updatedProfiles);
      saveProfiles(updatedProfiles);
    } catch (err) {
      console.error("Model refresh failed:", err);
    }
  }

  return (
    <div className="landing-page">
      {profiles.length === 0 && (
        <p>No profiles available. Go to Settings to add one.</p>
      )}
      {profiles.map((profile) => (
        <div className="model-list" key={profile.name}>
          <ProfileCard
            profile={profile}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            onRemove={() => {
              const updated = profiles.filter((p) => p.name !== profile.name);
              setProfiles(updated);
              saveProfiles(updated);
            }}
            onOpenChat={() => onOpenChat(profile, selectedModel)}
            isActive={profile.name === activeProfileName}
            onClick={() => setActiveProfileName(profile.name)}
            onRefreshModels={() => refreshModels(profile)}
          />
        </div>
      ))}
    </div>
  );
}
