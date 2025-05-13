import { Profile } from "../types/types";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { updateProfileModels } from "../store/profileStore";

type Props = {
  profile: Profile;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onRemove: () => void;
  onOpenChat: () => void;
};

export default function ProfileCard(props: Props) {
  const { profile, selectedModel, onSelectModel, onRemove, onOpenChat } = props;
  const { name, address, models } = profile;
  const [modelList, setModelList] = useState<string[]>(models);
  useEffect(() => {
    setModelList(profile.models);
  }, [profile.models]);
  const [waking, setWaking] = useState(false);
  return (
  
    <details className="profile-card">
      <summary className="profile-card-summary">
        {name} — {address}
      </summary>
      <div className="profile-card-content">
        <label>Select Model:</label>
        <select
          onChange={(e) => onSelectModel(e.target.value)}
          value={selectedModel}
        >
          {modelList.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <br />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button onClick={onRemove} className="profile-button">
            Remove
          </button>
          <button onClick={onOpenChat} className="profile-button open-chat">
            Open Chat
          </button>
          {profile.macAddress && (
            <button
              className="profile-button"
              disabled={waking}
              onClick={async () => {
                console.log("Sending magic packet...");
                setWaking(true);
                try {
                  await invoke("wake_on_lan", { profile });
                  toast.success("Magic packet sent! Attempting to fetch models...");
                  console.log("Magic packet sent.");

                  // Wait a few seconds to allow machine to boot
                  await new Promise((res) => setTimeout(res, 3000));
                  console.log("Finished timeout, trying to get models...");

                  let modelsJson: any = null;
                  for (let attempt = 1; attempt <= 3; attempt++) {
                    console.log(`Attempt ${attempt} to fetch models...`);
                    try {
                      modelsJson = await invoke("get_models", {
                        llmAddress: profile.address,
                      });
                      console.log("Raw modelsJson result:", modelsJson);

                      // Parse if returned as string
                      let parsedModels = typeof modelsJson === "string" ? JSON.parse(modelsJson) : modelsJson;
                      const modelNames = Array.isArray(parsedModels.models)
                        ? parsedModels.models.map((m: any) => m.name)
                        : [];

                      if (modelNames.length > 0) {
                        toast.success("Models loaded successfully.");
                        setModelList(modelNames);
                        console.log("Updated model list:", modelNames);
                        onSelectModel(modelNames[0]);
                        try {
                          await updateProfileModels(profile.name, modelNames);
                          console.log("Updated profile stored with new models.");
                        } catch (e) {
                          console.error("Failed to persist updated models to profile store:", e);
                        }
                        break;
                      }
                    } catch (error) {
                      console.warn(`Attempt ${attempt} to fetch models failed.`);
                      if (attempt < 3) {
                        await new Promise((res) => setTimeout(res, 2000));
                      }
                    }
                  }

                  if (!modelsJson) {
                    toast.error("Failed to load models after waking LLM.");
                  }
                } catch (err: any) {
                  const message = typeof err === "string"
                    ? err
                    : err?.message || JSON.stringify(err) || "Unknown error";
                  console.error("Failed to send magic packet:", message);
                  toast.error(`Wake failed: ${message}`);
                } finally {
                  setWaking(false);
                }
              }}
            >
              {waking ? (
                <>
                  <span className="spinner" /> Sending...
                </>
              ) : (
                "Wake LLM"
              )}
            </button>
          )}
        </div>
      </div>
    </details>
  );
}