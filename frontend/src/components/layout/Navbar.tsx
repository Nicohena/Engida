import { NavLink } from "react-router-dom";
import { Bell, MessageCircle, Compass } from "lucide-react";
import clsx from "clsx";
import { useAvatar } from "../../context/AvatarContext";
import { AvatarCircle } from "../profile/PhotoManagerDialog";

const links = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search" },
  { to: "/trips", label: "My Trips" },
];

export function Navbar() {
  const { avatarUrl, initials } = useAvatar();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <Compass size={20} />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            GUZO <span className="text-accent">ENGIDA</span>
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "rounded-lg px-4 py-2 text-sm font-medium transition",
                  isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink
            to="/messages"
            className={({ isActive }) =>
              clsx("rounded-full p-2 transition", isActive ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-100")
            }
          >
            <MessageCircle size={20} />
          </NavLink>
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              clsx("rounded-full p-2 transition", isActive ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-100")
            }
          >
            <Bell size={20} />
          </NavLink>

          {/* Profile avatar — shows saved photo or initials */}
          <NavLink
            to="/profile"
            aria-label="Go to profile"
            className={({ isActive }) =>
              clsx(
                "ml-1 block rounded-full transition ring-2",
                isActive ? "ring-primary" : "ring-transparent hover:ring-primary/40"
              )
            }
          >
            <AvatarCircle url={avatarUrl} initials={initials} size={36} />
          </NavLink>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-2 md:hidden">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              clsx("rounded-lg px-4 py-1.5 text-xs font-medium", isActive ? "text-primary" : "text-slate-500")
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
