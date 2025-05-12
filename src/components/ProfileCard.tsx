import { Profile } from "../store/profileStore";

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
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <br />
        <button onClick={onRemove} className="profile-button">
          Remove
        </button>
        <button onClick={onOpenChat} className="profile-button open-chat">
          Open Chat
        </button>
      </div>
    </details>
  );
}