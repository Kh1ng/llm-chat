import { useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import Button from "./Button";
import { Profile } from "../types/types";

type ProfileInfo = Pick<Profile, 'name' | 'address' | 'port' | 'auth' | 'models' | 'macAddress' | 'broadcastAddress'>;

export default function AppHeader() {
  const location = useLocation();
  const state = location.state as { profile?: ProfileInfo };

  return (
    <header className="sticky top-0 z-20 px-4 md:px-6 h-16 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors w-full flex items-center justify-between">
      <div className="flex items-center">
        <BackButton />
      </div>
      <div className="flex items-center justify-center">
        {location.pathname === "/" ? (
          <h1 className="text-3xl md:text-4xl font-semibold text-teal-600 dark:text-teal-400 m-0 tracking-tight transition-colors">Vellm</h1>
        ) : location.pathname === "/chat" && state?.profile ? (
          <div className="flex flex-col items-center">
            <span className="font-medium text-base truncate text-gray-700 dark:text-gray-300">{state.profile.name}</span>
            <span className="text-sm font-mono truncate text-gray-500 dark:text-gray-400">{state.profile.address}</span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-end">
        <ThemeToggle />
      </div>
    </header>
  );
}

function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/") return null;

  return (
    <Button 
      onClick={() => navigate(-1)} 
      variant="ghost"
      className="w-8 h-8 p-0 -ml-1"
      aria-label="Go back"
    >
      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
    </Button>
  );
}
