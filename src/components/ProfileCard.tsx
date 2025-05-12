import React from "react";

type Props = {
  name: string;
  address: string;
  models: string[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onRemove: () => void;
};

export default function ProfileCard({
  name,
  address,
  models,
  selectedModel,
  onSelectModel,
  onRemove,
}: Props) {
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
      </div>
    </details>
  );
}