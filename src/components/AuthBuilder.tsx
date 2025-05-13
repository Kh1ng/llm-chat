import React from "react";
import type { Auth } from "../types/types";

interface AuthBuilderProps {
  auth?: Auth;
  onChange: (auth: Auth) => void;
  showHeaderPreview?: boolean;
}

export default function AuthBuilder({ auth, onChange, showHeaderPreview = false }: AuthBuilderProps) {
  const type = auth?.type || "bearer";
  const value = auth?.value || "";
  const headerName = auth?.headerName || "";


  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as Auth["type"];
    onChange({
      type: newType,
      value,
      headerName: newType === "custom" ? headerName : undefined,
    });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      type,
      value: e.target.value,
      headerName: type === "custom" ? headerName : undefined,
    });
  };

  const handleHeaderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      type,
      value,
      headerName: e.target.value,
    });
  };

  const buildPreview = () => {
    const header = type === "custom" ? headerName || "Authorization" : "Authorization";
    const rendered =
      type === "bearer"
        ? `Bearer ${value}`
        : type === "basic"
        ? `Basic ${btoa(value)}`
        : value;
    return `${header}: ${rendered}`;
  };

  return (
    <div className="auth-builder">
      <label>
        Auth Type:
        <select value={type} onChange={handleTypeChange}>
          <option value="bearer">Bearer</option>
          <option value="basic">Basic</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      {type === "custom" && (
        <label>
          Header Name:
          <input type="text" value={headerName} onChange={handleHeaderNameChange} placeholder="e.g. X-API-Key" />
        </label>
      )}

      <label>
        Token / Credentials:
        <input type="text" value={value} onChange={handleValueChange} placeholder="your token..." />
      </label>

      {showHeaderPreview && value && (
        <pre className="auth-header-preview">
          {buildPreview()}
        </pre>
      )}
    </div>
  );
}