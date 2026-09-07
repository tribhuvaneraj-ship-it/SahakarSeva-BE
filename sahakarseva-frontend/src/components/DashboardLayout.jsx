import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = {
  customer: [
    { to: "/customer", label: "Find services", end: true },
    { to: "/profile", label: "Profile" },
  ],
  worker: [
    { to: "/worker", label: "Job requests", end: true },
    { to: "/profile", label: "Profile" },
  ],
  admin: [
    { to: "/admin", label: "Overview", end: true },
    { to: "/profile", label: "Profile" },
  ],
};

export default function DashboardLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS[user?.role] || [];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="ss-shell">
      <aside className="ss-sidebar">
        <div className="ss-brand">
          <span className="ss-brand-mark">सह</span>
          <span className="ss-brand-name">SahakarSeva</span>
        </div>

        <nav className="ss-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                "ss-nav-link" + (isActive ? " ss-nav-link-active" : "")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ss-sidebar-footer">
          <div className="ss-user-chip">
            <div className="ss-avatar">{user?.name?.[0]?.toUpperCase() || "?"}</div>
            <div>
              <div className="ss-user-name">{user?.name}</div>
              <div className="ss-user-role">{user?.role}</div>
            </div>
          </div>
          <button className="ss-btn ss-btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="ss-main">
        <header className="ss-topbar">
          <h1>{title}</h1>
        </header>
        <main className="ss-content">{children}</main>
      </div>
    </div>
  );
}
