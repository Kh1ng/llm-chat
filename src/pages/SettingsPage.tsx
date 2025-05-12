import ProfileForm from "../components/ProfileForm";


export default function SettingsPage() {
  return (
    <div className="settings-page">
      <h2>Manage Profiles</h2>
      <p>Add a new profile by entering a name and an LLM URL or IP. This will fetch available models and save them locally.</p>
      <div className="settings-form-container">
        <ProfileForm />
      </div>
    </div>
  );
}