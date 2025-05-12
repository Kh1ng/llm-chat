import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast, Toaster } from "sonner";
import { loadProfiles, saveProfiles } from "../store/profileStore";

/**
 * ProfileForm is a reusable component for creating a new LLM profile.
 * Accepts an optional `onSave` callback to trigger a refresh after saving.
 */
export default function ProfileForm({ onSave }: { onSave?: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const modelsJson = await invoke("get_models", { llmAddress: address });
      const parsed = JSON.parse(modelsJson as string);
      const newProfile = {
        name,
        address,
        models: parsed.models.map((m: any) => m.name),
      };

      const existing = await loadProfiles();
      const updated = [
        ...existing.filter((p) => p.name !== newProfile.name),
        newProfile,
      ];
      await saveProfiles(updated);

      toast.success("Profile saved!");
      setName("");
      setAddress("");
      if (onSave) onSave();
    } catch (err) {
      toast.error(`LLM unreachable at ${address}`, {
        description: "We'll still save this profile, but it may not be online.",
      });

      const newProfile = {
        name,
        address,
        models: [],
      };
      const existing = await loadProfiles();
      const updated = [
        ...existing.filter((p) => p.name !== newProfile.name),
        newProfile,
      ];
      await saveProfiles(updated);

      setName("");
      setAddress("");
      if (onSave) onSave();
    }
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Profile name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="LLM URL or IP"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <button type="submit">Save Profile</button>
      </form>
    </>
  );
}