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
  
    <details style={{ marginBottom: "1rem" }}>
      <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
        {name} — {address}
      </summary>
      <div style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
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
        <button onClick={onRemove} style={{ marginTop: "0.5rem" }}>
          Remove
        </button>
        <button onClick={onOpenChat} style={{ marginLeft: "0.5rem", marginTop: "0.5rem" }}>
          Open Chat
        </button>
      </div>
    </details>
  );
}