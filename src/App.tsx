import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import SettingsPage from "./pages/SettingsPage";
import { Profile } from "./types/types";
import ChatPage from "./pages/ChatPage";
import "./App.css";
import { Toaster } from "sonner";

function App() {
  const [view, setView] = useState<"landing" | "settings" | "chat">("landing");
  const [chatProfile, setChatProfile] = useState<Profile | null>(null);
  const [chatModel, setChatModel] = useState("");

  return (
    <>
      <Toaster position="top-right" richColors closeButton expand />
      <header>
        {view === "landing" ? (
          <button onClick={() => setView("settings")} className="themed-button">Settings</button>
        ) : (
          <button onClick={() => setView("landing")} className="themed-button">
            ←
          </button>
        )}
      </header>

      {view === "landing" ? (
        <LandingPage
          onOpenChat={(profile, model) => {
            setChatProfile(profile);
            setChatModel(model);
            setView("chat");
          }}
        />
      ) : view === "settings" ? (
        <SettingsPage />
      ) : chatProfile && chatModel ? (
        <ChatPage profile={chatProfile} model={chatModel} />
      ) : (
        <p>Missing chat context.</p>
      )}
    </>
  );
}

export default App;
