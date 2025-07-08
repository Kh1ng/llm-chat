import React from "react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { saveOrUpdateProfile } from "../store/profileStore";
import AuthBuilder from "./AuthBuilder";
import { Auth } from "../types/types";
import HelpTooltip from "./HelpTooltip";
import { getBroadcastAddress } from "../utils/validation";

import {
  isValidAddress,
  looksLikeIpWithoutPort,
  isValidMacAddress,
} from "../utils/validation";

/**
 * ProfileForm is a reusable component for creating a new LLM profile.
 * Accepts an optional `onSave` callback to trigger a refresh after saving.
 */
export default function ProfileForm({
  onSave,
  profile,
}: {
  onSave?: () => void;
  profile?: any;
}) {
  // Pre-fill fields if editing
  const [name, setName] = useState(profile?.name || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [auth, setAuth] = useState<Auth | undefined>(profile?.auth);
  const [useAuth, setUseAuth] = useState(!!profile?.auth);
  const [useWakeOnLan, setUseWakeOnLan] = useState(!!profile?.macAddress);
  const [macAddress, setMacAddress] = useState(profile?.macAddress || "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [broadcastAddress, setBroadcastAddress] = useState(
    profile?.broadcastAddress || "",
  );
  const [bindAddress, setBindAddress] = useState(profile?.bindAddress || "");
  const [port, setPort] = useState(profile?.port?.toString() || "11434");
  const [loading, setLoading] = useState(false);

  // Auto-detect broadcast address when address changes and not in advanced mode
  React.useEffect(() => {
    if (!showAdvanced && address) {
      const auto = getBroadcastAddress(address);
      setBroadcastAddress(auto);
    }
  }, [address, showAdvanced]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (useWakeOnLan && !isValidMacAddress(macAddress)) {
      toast.error(
        "Invalid MAC address. Please enter a valid format (e.g. AA:BB:CC:DD:EE:FF).",
      );
      return;
    }
    if (!isValidAddress(address)) {
      if (looksLikeIpWithoutPort(address)) {
        console.log("Please fix this one day.");
      } else {
        toast.error("Please enter a valid IP Address or domain.");
        return;
      }
    }
    setLoading(true);
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout contacting server")), 10000),
      );
      // Compose address with port if not already present
      let addressWithPort = address;
      if (port && !/:[0-9]+$/.test(address)) {
        addressWithPort = address.replace(/:\d+$/, "") + ":" + port;
      }
      const modelsJson = await Promise.race([
        invoke("get_models", { llmAddress: addressWithPort }),
        timeout,
      ]);
      const parsed = JSON.parse(modelsJson as string);
      const newProfile = {
        name,
        address,
        port: port ? parseInt(port) : 11434,
        models: parsed.models.map((m: any) => m.name),
        ...(useAuth && auth?.value ? { auth } : {}),
        ...(useWakeOnLan && macAddress ? { macAddress } : {}),
        ...(broadcastAddress ? { broadcastAddress } : {}),
        ...(bindAddress ? { bindAddress } : {}),
      };
      await saveOrUpdateProfile(newProfile);
      toast.success("Profile saved!");
      if (!profile) {
        // Only clear if creating new
        setName("");
        setAddress("");
      }
      if (onSave) onSave();
    } catch {
      toast.error(`LLM unreachable at ${address}`, {
        description: "We'll still save this profile, but it may not be online.",
      });
      const newProfile = {
        name,
        address,
        port: port ? parseInt(port) : 11434,
        models: [],
        ...(useAuth && auth?.value ? { auth } : {}),
        ...(useWakeOnLan && macAddress ? { macAddress } : {}),
        ...(broadcastAddress ? { broadcastAddress } : {}),
        ...(bindAddress ? { bindAddress } : {}),
      };
      await saveOrUpdateProfile(newProfile);
      if (!profile) {
        setName("");
        setAddress("");
      }
      if (onSave) onSave();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="profile-form">
        <input
          className="themed-input"
          placeholder="Profile name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="themed-input"
          placeholder="LLM URL or IP"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <input
          className="themed-input"
          type="number"
          placeholder="Port (default 11434)"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          min={1}
          max={65535}
        />
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="themed-button"
        >
          {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}
        </button>
        {showAdvanced && (
          <>
            <label>
              <input
                type="checkbox"
                checked={useAuth}
                onChange={(e) => setUseAuth(e.target.checked)}
              />
              Add authentication
            </label>
            {useAuth && (
              <AuthBuilder
                auth={auth}
                onChange={(newAuth) => setAuth(newAuth)}
                showHeaderPreview
              />
            )}
            <label>
              <input
                type="checkbox"
                checked={useWakeOnLan}
                onChange={(e) => setUseWakeOnLan(e.target.checked)}
              />
              Enable Wake-on-LAN
            </label>
          </>
        )}
        {useWakeOnLan && (
          <>
            <input
              className="themed-input"
              type="text"
              placeholder="MAC address (e.g. AA:BB:CC:DD:EE:FF)"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
            />
            <label>
              Broadcast Address{" "}
              <HelpTooltip text="Auto-detected from LLM address. Enable Advanced to override." />
            </label>
            <input
              className="themed-input"
              type="text"
              placeholder="192.168.1.255"
              value={broadcastAddress}
              onChange={(e) => setBroadcastAddress(e.target.value)}
              readOnly={!showAdvanced}
            />
            <label>
              Bind Address{" "}
              <HelpTooltip text="Optional: Your machine's IP to bind from (needed on macOS, e.g. 192.168.1.100)" />
            </label>
            <input
              className="themed-input"
              type="text"
              placeholder="192.168.1.100"
              value={bindAddress}
              onChange={(e) => setBindAddress(e.target.value)}
              readOnly={!showAdvanced}
            />
          </>
        )}
        <button type="submit" disabled={loading} className="themed-button">
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </>
  );
}
