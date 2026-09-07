import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { userApi } from "../api/services";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", address: "", skills: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    userApi
      .profile()
      .then((res) => {
        const body = res.data;
        const data = body.data?.user ?? body.user ?? body;
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || "",
          skills: (data.skills || []).join(", "),
        });
      })
      .catch(() => setError("Couldn't load your profile."))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        ...(user?.role === "worker"
          ? { skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean) }
          : {}),
      };
      const res = await userApi.updateProfile(payload);
      const body = res.data;
      const updated = body.data?.user ?? body.user ?? body;
      const token = localStorage.getItem("ss_token");
      login(token, updated);
      setMessage("Profile updated.");
    } catch {
      setError("Couldn't save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout title="Profile">
      <section className="ss-card ss-profile-card">
        {loading && <p className="ss-empty">Loading…</p>}
        {!loading && (
          <form onSubmit={handleSubmit}>
            <label className="ss-field">
              <span>Full name</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label className="ss-field">
              <span>Phone number</span>
              <input name="phone" value={form.phone} onChange={handleChange} />
            </label>
            <label className="ss-field">
              <span>Address</span>
              <input name="address" value={form.address} onChange={handleChange} />
            </label>
            {user?.role === "worker" && (
              <label className="ss-field">
                <span>Skills / services offered (comma separated)</span>
                <input
                  name="skills"
                  value={form.skills}
                  onChange={handleChange}
                  placeholder="Plumbing, tap repair, pipe fitting"
                />
              </label>
            )}
            {message && <p className="ss-field-success">{message}</p>}
            {error && <p className="ss-field-error">{error}</p>}
            <button className="ss-btn ss-btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        )}
      </section>
    </DashboardLayout>
  );
}
