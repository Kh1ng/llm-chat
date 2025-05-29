import React from "react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { saveOrUpdateProfile } from "../store/profileStore";
import AuthBuilder from "./AuthBuilder";
import { Auth } from "../types/types";
import HelpTooltip from "./HelpTooltip";

import {
  isValidAddress,
  looksLikeIpWithoutPort,
  isValidMacAddress,
} from "../utils/validation";

/**
 * ProfileForm is a reusable component for creating a new LLM profile.
 * Accepts an optional `onSave` callback to trigger a refresh after saving.
 */
export default function ProfileForm({ onSave }: { onSave?: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [auth, setAuth] = useState<Auth | undefined>(undefined);
  const [useAuth, setUseAuth] = useState(false);
  const [useWakeOnLan, setUseWakeOnLan] = useState(false);
  const [macAddress, setMacAddress] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [broadcastAddress, setBroadcastAddress] = useState("");
  const [port, setPort] = useState("");
  const [bindAddress, setBindAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (useWakeOnLan && !isValidMacAddress(macAddress)) {
      toast.error(
        "Invalid MAC address. Please enter a valid format (e.g. AA:BB:CC:DD:EE:FF)."
      );
      return;
    }
    if (!isValidAddress(address)) {
      if (looksLikeIpWithoutPort(address)) {
        toast.warning(
          "That looks like an IP address — did you forget the port?"
        );
      } else {
        toast.error("Please enter a valid IP Address or domain.");
        return;
      }
    }
    setLoading(true);
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout contacting server")), 10000)
      );

      const modelsJson = await Promise.race([
        invoke("get_models", { llmAddress: address }),
        timeout,
      ]);

      const parsed = JSON.parse(modelsJson as string);
      const newProfile = {
        name,
        address,
        models: parsed.models.map((m: any) => m.name),
        ...(useAuth && auth?.value ? { auth } : {}),
        ...(useWakeOnLan && macAddress ? { macAddress } : {}),
        ...(broadcastAddress ? { broadcastAddress } : {}),
        ...(port ? { port: parseInt(port) } : {}),
        ...(bindAddress ? { bindAddress } : {}),
      };

      await saveOrUpdateProfile(newProfile);

      toast.success("Profile saved!");
      setName("");
      setAddress("");
      if (onSave) onSave();
    } catch {
      toast.error(`LLM unreachable at ${address}`, {
        description: "We'll still save this profile, but it may not be online.",
      });

      const newProfile = {
        name,
        address,
        models: [],
        ...(useAuth && auth?.value ? { auth } : {}),
        ...(useWakeOnLan && macAddress ? { macAddress } : {}),
        ...(broadcastAddress ? { broadcastAddress } : {}),
        ...(port ? { port: parseInt(port) } : {}),
        ...(bindAddress ? { bindAddress } : {}),
      };
      await saveOrUpdateProfile(newProfile);

      setName("");
      setAddress("");
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
            {useWakeOnLan && (
              <input
                className="themed-input"
                type="text"
                placeholder="MAC address (e.g. AA:BB:CC:DD:EE:FF)"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
              />
            )}
            <label>
              Broadcast Address{" "}
              <HelpTooltip text="Optional: IP to broadcast the magic packet to (e.g. 192.168.1.255)" />
            </label>
            <input
              className="themed-input"
              type="text"
              placeholder="192.168.1.255"
              value={broadcastAddress}
              onChange={(e) => setBroadcastAddress(e.target.value)}
            />
            <label>
              Port{" "}
              <HelpTooltip text="Optional: Port to send the magic packet on (default is 9)" />
            </label>
            <input
              className="themed-input"
              type="number"
              placeholder="9"
              value={port}
              onChange={(e) => setPort(e.target.value)}
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
