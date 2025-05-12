import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Toaster, toast } from "sonner";
import "./App.css";

function App() {
  const [profiles, setProfiles] = useState<{ name: string; address: string; models: string[] }[]>([]);
  const [currentProfile, setCurrentProfile] = useState({ name: "", address: "" });
  const [selectedModel, setSelectedModel] = useState("");

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
      setProfiles((prev) => [
        ...prev.filter((p) => p.name !== newProfile.name),
        newProfile,
      ]);
    } catch (err) {
      toast.error(`LLM unreachable at ${currentProfile.address}`, {
        description: "We'll still save this profile, but it may not be online.",
      });
      const newProfile = {
        ...currentProfile,
        models: [],
      };
      setProfiles((prev) => [
        ...prev.filter((p) => p.name !== newProfile.name),
        newProfile,
      ]);
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
        <div key={profile.name}>
          <h3>
            {profile.name} — {profile.address}
          </h3>
          <select
            onChange={(e) => setSelectedModel(e.target.value)}
            value={selectedModel}
          >
            {profile.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      ))}
    </main>
  );
}

export default App;