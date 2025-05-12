import ProfileForm from "../components/ProfileForm";


export default function SettingsPage() {
  return (
    <div style={{ padding: "1rem" }}>
      <h2>Manage Profiles</h2>
      <p>Add a new profile by entering a name and an LLM URL or IP. This will fetch available models and save them locally.</p>
      <div style={{ marginTop: "1rem" }}>
        <ProfileForm />
      </div>
    </div>
  );
}