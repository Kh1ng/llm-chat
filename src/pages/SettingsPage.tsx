import ProfileForm from "../components/ProfileForm";
import ThemeToggle from "../components/ThemeToggle";


export default function SettingsPage() {
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Manage Profiles</h2>
        <p>Add a new profile by entering a name and an LLM URL or IP. This will fetch available models and save them locally.</p>
      </div>
      <div className="settings-form-container">
        <ProfileForm />
      </div>
    </div>
  );
}