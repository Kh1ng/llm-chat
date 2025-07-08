import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { updateProfileModels } from "../store/profileStore";
import { ProfileCardProps } from "../types/types";
import "../styles/buttons.css";
import "../styles/cards.css";

export default function ProfileCard(props: ProfileCardProps & { onEdit?: (profile: any) => void }) {
  const {
    profile,
    selectedModel,
    onSelectModel,
    onRemove,
    onOpenChat,
    isActive,
    onClick,
    onRefreshModels,
  } = props;
  const { name, address, models } = profile;
  const [modelList, setModelList] = useState<string[]>(models);
  const [waking, setWaking] = useState(false);
  const [status, setStatus] = useState<"checking" | "waking" | "ready" | "unavailable" | "error">("unavailable");

  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    setModelList(profile.models);
  }, [profile.models]);

useEffect(() => {
  let cancelled = false;

  (async () => {
    if (isActive && status === "unavailable" && !waking) {
      console.log("Auto-checking model status...");
      setStatus("checking");

      try {
        const result = await onRefreshModels();
        if (!cancelled) {
          if (Array.isArray(result) && result.length > 0) {
            setModelList(result);
            setStatus("ready");
          } else {
            setStatus("unavailable");
          }
        }
      } catch (err) {
        console.error("Auto-refresh models failed:", err);
        if (!cancelled) {
          setStatus("error");
        }
      }
    }
    if (status === "error") {
      setStatus("unavailable")
    }
  })();

  return () => {
    cancelled = true;
  };
// eslint-disable-next-line react-hooks/exhaustive-deps  
}, [isActive, waking]);

  return (
    <details className="profile-card" open={isActive}>
      <summary
        className="profile-card-summary"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        tabIndex={0}
      >
        {name} — {address}
      </summary>
      <div className="profile-card-content">
        <div className="model-select-row">
          <label htmlFor={`model-select-${name}`}>Select Model:</label>
          <select
            id={`model-select-${name}`}
            onChange={(e) => onSelectModel(e.target.value)}
            value={selectedModel}
            disabled={waking || modelList.length === 0 || status === "unavailable"}
            className={`model-select ${waking || modelList.length === 0 || status === "unavailable" ? "disabled" : ""}`}
          >
            {modelList.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          <div className="status-indicator">
            <span>Status:</span>
            {status === "checking" || status === "waking" ? (
              <>
                <span className="spinner" />
                <span style={{ color: "orange" }}>
                  {status === "waking" ? "Waking" : "Checking"}
                  <span className="animated-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </span>
              </>
            ) : status === "ready" ? (
              <span style={{ color: "green" }}>Ready</span>
            ) : (
              <span style={{ color: "red" }}>Unavailable</span>
            )}
          </div>
        </div>
        <br />
        <div className="profile-button-group">
          <button onClick={onRemove} className="profile-button">
            Remove
          </button>
          <button onClick={onOpenChat} className="profile-button open-chat" disabled={status !== "ready"}>
            Open Chat
          </button>
          <button onClick={() => props.onEdit && props.onEdit(profile)} className="profile-button">
            Edit
          </button>
          {profile.macAddress && (
            <button
              className="profile-button"
              disabled={waking}
              onClick={async () => {
                console.log("Sending magic packet...");
                setWaking(true);
                setStatus("waking");
                try {
                  await invoke("wake_on_lan", { profile });
                  toast.success(
                    "Magic packet sent! Attempting to fetch models..."
                  );
                  console.log("Magic packet sent.");

                  // Wait a few seconds to allow machine to boot
                  await new Promise((res) => setTimeout(res, 3000));
                  console.log("Finished timeout, trying to get models...");

                  let modelsJson: any = null;
                  for (let attempt = 1; attempt <= 3; attempt++) {
                    console.log(`Attempt ${attempt} to fetch models...`);
                    try {
                      modelsJson = await invoke("get_models", {
                        llmAddress: profile.address,
                      });
                      console.log("Raw modelsJson result:", modelsJson);

                      // Parse if returned as string
                      let parsedModels =
                        typeof modelsJson === "string"
                          ? JSON.parse(modelsJson)
                          : modelsJson;
                      const modelNames = Array.isArray(parsedModels.models)
                        ? parsedModels.models.map((m: any) => m.name)
                        : [];

                      if (modelNames.length > 0) {
                        toast.success("Models loaded successfully.");
                        setModelList(modelNames);
                        setStatus("ready");
                        console.log("Updated model list:", modelNames);
                        onSelectModel(modelNames[0]);
                        try {
                          await updateProfileModels(profile.name, modelNames);
                          console.log(
                            "Updated profile stored with new models."
                          );
                        } catch (e) {
                          console.error(
                            "Failed to persist updated models to profile store:",
                            e
                          );
                        }
                        break;
                      }
                    } catch (error) {
                      console.warn(
                        `Attempt ${attempt} to fetch models failed.`
                      );
                      console.error("Fetch attempt error:", error);
                      if (attempt < 3) {
                        await new Promise((res) => setTimeout(res, 2000));
                      }
                    }
                  }

                  if (!modelsJson) {
                    toast.error("Failed to load models after waking LLM.");
                    setStatus("unavailable");
                  }
                } catch (err: any) {
                  const message =
                    typeof err === "string"
                      ? err
                      : err?.message || JSON.stringify(err) || "Unknown error";
                  console.error("Failed to send magic packet:", message);
                  toast.error(`Wake failed: ${message}`);
                  setStatus("unavailable");
                } finally {
                  setWaking(false);
                }
              }}
            >
              {waking ? (
                <>
                  <span className="spinner" /> Sending...
                </>
              ) : (
                "Wake LLM"
              )}
            </button>
          )}
          <button
            className="profile-button"
            disabled={waking}
            onClick={() => {
              console.log("Refreshing models...");
              setStatus("checking");
              Promise.resolve(onRefreshModels())
                .then((result) => {
                  if (Array.isArray(result) && result.length > 0) {
                    setStatus("ready");
                  } else {
                    setStatus("unavailable");
                  }
                })
                .catch((err) => {
                  console.error("Refresh models failed:", err);
                  setStatus("unavailable");
                });
            }}
          >
            Refresh Models
          </button>
        </div>
      </div>
    </details>
  );
}
