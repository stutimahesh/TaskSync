import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import useTheme from "../hooks/useTheme.jsx";
import Avatar from "./Avatar.jsx";
import { LogOutIcon, MoonIcon, SunIcon } from "./Icons.jsx";

export default function Navbar({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <img src="/favicon.svg" alt="" width="30" height="30" />
        <span>TaskSync</span>
      </Link>
      <div className="navbar-center">{children}</div>
      <div className="nav-actions">
        <button
          className="icon-btn"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle colour theme"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        {user && (
          <>
            <div className="user-chip">
              <Avatar user={user} size={30} />
              <span>{user.name}</span>
            </div>
            <button className="icon-btn" onClick={logout} title="Log out" aria-label="Log out">
              <LogOutIcon />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
