import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { adminApi } from "../api/services";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");

  function loadAll() {
    setLoading(true);
    Promise.allSettled([adminApi.stats(), adminApi.users(), adminApi.bookings()]).then(
      ([statsRes, usersRes, bookingsRes]) => {
        if (statsRes.status === "fulfilled")
          setStats(statsRes.value.data.stats ?? statsRes.value.data);
        if (usersRes.status === "fulfilled")
          setUsers(usersRes.value.data.users ?? usersRes.value.data ?? []);
        if (bookingsRes.status === "fulfilled")
          setBookings(bookingsRes.value.data.bookings ?? bookingsRes.value.data ?? []);
        setLoading(false);
      }
    );
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function verify(id) {
    setActionError("");
    try {
      await adminApi.verifyWorker(id);
      loadAll();
    } catch {
      setActionError("Couldn't verify that worker.");
    }
  }

  async function toggleBlock(id, blocked) {
    setActionError("");
    try {
      await adminApi.toggleBlock(id, !blocked);
      loadAll();
    } catch {
      setActionError("Couldn't update that user.");
    }
  }

  return (
    <DashboardLayout title="Platform overview">
      <section className="ss-stats-grid">
        <div className="ss-stat-card">
          <span className="ss-stat-value">{stats?.totalUsers ?? "—"}</span>
          <span className="ss-stat-label">Total users</span>
        </div>
        <div className="ss-stat-card">
          <span className="ss-stat-value">{stats?.totalWorkers ?? "—"}</span>
          <span className="ss-stat-label">Active workers</span>
        </div>
        <div className="ss-stat-card">
          <span className="ss-stat-value">{stats?.totalBookings ?? "—"}</span>
          <span className="ss-stat-label">Bookings</span>
        </div>
        <div className="ss-stat-card">
          <span className="ss-stat-value">{stats?.completedBookings ?? "—"}</span>
          <span className="ss-stat-label">Completed jobs</span>
        </div>
      </section>

      {actionError && <p className="ss-field-error">{actionError}</p>}

      <div className="ss-tabs">
        <button
          className={`ss-tab ${tab === "users" ? "ss-tab-active" : ""}`}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          className={`ss-tab ${tab === "bookings" ? "ss-tab-active" : ""}`}
          onClick={() => setTab("bookings")}
        >
          Bookings
        </button>
      </div>

      {loading && <p className="ss-empty">Loading…</p>}

      {!loading && tab === "users" && (
        <table className="ss-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Verified</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id ?? u.id}>
                <td>
                  {u.name}
                  <div className="ss-table-sub">{u.email}</div>
                </td>
                <td>{u.role}</td>
                <td>
                  <span
                    className={`ss-badge ${u.blocked ? "ss-badge-rejected" : "ss-badge-accepted"}`}
                  >
                    {u.blocked ? "Blocked" : "Active"}
                  </span>
                </td>
                <td>{u.role === "worker" ? (u.verified ? "Yes" : "No") : "—"}</td>
                <td className="ss-row-actions">
                  {u.role === "worker" && !u.verified && (
                    <button
                      className="ss-btn ss-btn-secondary"
                      onClick={() => verify(u._id ?? u.id)}
                    >
                      Verify
                    </button>
                  )}
                  <button
                    className="ss-btn ss-btn-ghost"
                    onClick={() => toggleBlock(u._id ?? u.id, u.blocked)}
                  >
                    {u.blocked ? "Unblock" : "Block"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tab === "bookings" && (
        <table className="ss-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Customer</th>
              <th>Worker</th>
              <th>Status</th>
              <th>Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id ?? b.id}>
                <td>{b.service?.name || b.serviceName}</td>
                <td>{b.customer?.name || "—"}</td>
                <td>{b.worker?.name || "Unassigned"}</td>
                <td>
                  <span className={`ss-badge ss-badge-${b.status}`}>{b.status}</span>
                </td>
                <td>{new Date(b.scheduledAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DashboardLayout>
  );
}
