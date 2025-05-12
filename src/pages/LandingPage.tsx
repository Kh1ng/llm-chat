import ProfileCard from "../components/ProfileCard";
import { useEffect, useState } from "react";
import { loadProfiles, saveProfiles, Profile } from "../store/profileStore";

export default function LandingPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    loadProfiles().then(setProfiles);
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Select a Model</h2>
      {profiles.length === 0 && (
        <p>No profiles available. Go to Settings to add one.</p>
      )}
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.name}
          name={profile.name}
          address={profile.address}
          models={profile.models}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          onRemove={() => {
            const updated = profiles.filter((p) => p.name !== profile.name);
            setProfiles(updated);
            saveProfiles(updated);
          }}
        />
      ))}
    </div>
  );
}