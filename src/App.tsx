import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import SettingsPage from "./pages/SettingsPage";
import { Profile } from "./store/profileStore";
import ChatPage from "./pages/ChatPage";
import "./App.css";

function App() {
  const [view, setView] = useState<"landing" | "settings" | "chat">("landing");
  const [chatProfile, setChatProfile] = useState<Profile | null>(null);
  const [chatModel, setChatModel] = useState("");

  return (
    <>
      <header>
        {view === "landing" ? (
          <button onClick={() => setView("settings")} className="settings-button">Settings</button>
        ) : (
          <button onClick={() => setView("landing")} className="back-button">
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
