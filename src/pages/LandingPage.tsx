import ProfileCard from "../components/ProfileCard";
import { useEffect, useState } from "react";
import { loadProfiles, saveProfiles, Profile } from "../store/profileStore";

type LandingPageProps = {
  onOpenChat: (profile: Profile, model: string) => void;
};

export default function LandingPage({ onOpenChat }: LandingPageProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    loadProfiles().then((data) => {
      setProfiles(data);
      if (data.length > 0 && data[0].models.length > 0) {
        setSelectedModel(data[0].models[0]);
      }
    });
  }, []);

  return (
    <div className="landing-page">
      <h2>Select a Model</h2>
      {profiles.length === 0 && (
        <p>No profiles available. Go to Settings to add one.</p>
      )}
      {profiles.map((profile) => (
        <div key={profile.name}>
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
          />
        </div>
      ))}
    </div>
  );
}
