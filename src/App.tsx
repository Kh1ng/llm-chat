import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Toaster, toast } from "sonner";
import { useEffect } from "react";
import { loadProfiles, saveProfiles } from "./store/profileStore";
import ProfileCard from "./components/ProfileCard";
import "./App.css";

function App() {
  const [profiles, setProfiles] = useState<
    { name: string; address: string; models: string[] }[]
  >([]);
  const [currentProfile, setCurrentProfile] = useState({
    name: "",
    address: "",
  });
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    loadProfiles().then(setProfiles);
  }, []);

  async function handleAddProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const modelsJson = await invoke("get_models", {
        llmAddress: currentProfile.address,
      });
      const parsed = JSON.parse(modelsJson as string);
      const newProfile = {
        ...currentProfile,
        models: parsed.models.map((m: any) => m.name),
      };
      setProfiles((prev) => {
        const updated = [
          ...prev.filter((p) => p.name !== newProfile.name),
          newProfile,
        ];
        saveProfiles(updated);
        return updated;
      });
    } catch (err) {
      toast.error(`LLM unreachable at ${currentProfile.address}`, {
        description: "We'll still save this profile, but it may not be online.",
      });
      const newProfile = {
        ...currentProfile,
        models: [],
      };
      setProfiles((prev) => {
        const updated = [
          ...prev.filter((p) => p.name !== newProfile.name),
          newProfile,
        ];
        saveProfiles(updated);
        return updated;
      });
    }
  }

  return (
    <main className="container">
      <Toaster richColors position="top-right" />
      <h1>Welcome to LLM Chat</h1>
      <p>Set up and select from your LLM profiles:</p>

      <form className="row" onSubmit={handleAddProfile}>
        <input
          placeholder="Profile name"
          onChange={(e) =>
            setCurrentProfile((p) => ({ ...p, name: e.target.value }))
          }
        />
        <input
          placeholder="LLM URL or IP"
          onChange={(e) =>
            setCurrentProfile((p) => ({ ...p, address: e.target.value }))
          }
        />
        <button type="submit">Check & Save</button>
      </form>

      {profiles.map((profile) => (
        <ProfileCard
          key={profile.name}
          name={profile.name}
          address={profile.address}
          models={profile.models}
          selectedModel={selectedModel}
          onSelectModel={(model) => setSelectedModel(model)}
          onRemove={() => {
            const updated = profiles.filter((p) => p.name !== profile.name);
            setProfiles(updated);
            saveProfiles(updated);
          }}
        />
      ))}
    </main>
  );
}

export default App;
