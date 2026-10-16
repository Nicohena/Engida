/**
 * AvatarContext — single source of truth for the logged-in user's avatar URL.
 * Both the Navbar and the Profile page subscribe to this so they stay in sync.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../lib/api";

interface AvatarContextValue {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  initials: string;
  setInitials: (s: string) => void;
}

const AvatarContext = createContext<AvatarContextValue>({
  avatarUrl: null,
  setAvatarUrl: () => {},
  initials: "G",
  setInitials: () => {},
});

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("G");

  useEffect(() => {
    api.getProfile().then((p) => {
      if (p?.avatar) setAvatarUrl(resolveAvatarUrl(p.avatar));
      const first = p?.firstName?.[0] ?? "";
      const last = p?.lastName?.[0] ?? "";
      setInitials((first + last).toUpperCase() || "G");
    }).catch(() => {});
  }, []);

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl, initials, setInitials }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  return useContext(AvatarContext);
}

/** Converts a relative /avatars/... path from the backend into a full URL. */
export function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  // Backend runs on :4000 in dev; Vite proxy forwards /api but NOT /avatars,
  // so we must prefix the backend origin explicitly.
  const backendOrigin = (import.meta as any).env?.VITE_API_ORIGIN || "http://localhost:4000";
  return `${backendOrigin}${url}`;
}
