import React, { useState, useEffect, useCallback } from "react";
import ProfileCard from "../components/ProfileCard";
import { loadProfiles, saveProfiles } from "../store/profileStore";
import { Profile } from "../types/types";
import { LandingPageProps } from "../types/types";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";

export default function LandingPage({ onOpenChat }: LandingPageProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [activeProfileName, setActiveProfileName] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();

  useEffect(() => {
    loadProfiles().then((data) => {
      setProfiles(data);
      if (data.length > 0 && data[0].models.length > 0) {
        setSelectedModel(data[0].models[0]);
      }
    });
  }, []);

  const refreshModels = useCallback(
    async (profile: Profile) => {
      try {
        const modelsJson: any = await invoke("get_models", {
          llmAddress: profile.address,
          llmPort: profile.port,
          auth: profile.auth,
        });
        const parsedModels =
          typeof modelsJson === "string" ? JSON.parse(modelsJson) : modelsJson;
        const modelNames = Array.isArray(parsedModels.models)
          ? parsedModels.models.map((m: any) => m.name)
          : [];
        const updatedProfiles = profiles.map((p) =>
          p.name === profile.name ? { ...p, models: modelNames } : p,
        );
        setProfiles(updatedProfiles);
        saveProfiles(updatedProfiles);
        return modelNames;
      } catch (err) {
        console.error("Model refresh failed:", err);
        return [];
      }
    },
    [profiles], // re-create only when profiles change
  );

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
            onClick={() =>
              setActiveProfileName(
                profile.name === activeProfileName ? null : profile.name,
              )
            }
            onRefreshModels={() => refreshModels(profile)}
            onEdit={(profile) => navigate("/settings", { state: { profile } })}
          />
        </div>
      ))}
      <div className="add-profile-btn-bottom-wrapper">
        <button
          onClick={() => navigate("/settings")}
          className="themed-button add-profile-btn-bottom"
        >
          Add Profile
        </button>
      </div>
    </div>
  );
}

