import { useLocation, useNavigate } from "react-router-dom";
import ProfileForm from "../components/ProfileForm";

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const editingProfile = location.state?.profile;

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Manage Profiles</h2>
        <p>
          Add a new profile by entering a name and an LLM URL or IP. This will
          fetch available models and save them locally.
        </p>
      </div>
      <div className="settings-form-container">
        <ProfileForm
          profile={editingProfile}
          onSave={() => navigate("/settings", { replace: true })}
        />
      </div>
    </div>
  );
}
