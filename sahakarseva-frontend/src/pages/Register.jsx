import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/services";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await authApi.register(form);
      const data = response.data;
      const user = data.user ?? data.data?.user;
      login(data.token ?? data.data?.token, user);
      navigate(`/${user.role}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Unable to create account.");
    }
  }

  return (
    <AuthLayout
      eyebrow="JOIN THE NETWORK"
      title="Make good work easier to find."
      description="Create your free account as a customer or local worker and take part in a more connected way to get things done."
      alternate={<><span>Already registered?</span> <Link to="/login">Sign in</Link></>}
    >
      <div className="ss-auth-heading">
        <h2>Create account</h2>
        <span className="ss-auth-step">01 / 01</span>
      </div>
      <form className="ss-auth-form" onSubmit={submit}>
        <label className="ss-field">
          Your name
          <input required placeholder="e.g. Priya Sharma" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="ss-field">
          Email address
          <input required type="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="ss-field">
          Password
          <input required minLength={6} type="password" placeholder="At least 6 characters" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>
        <label className="ss-field">
          I am joining as
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="customer">A customer looking for help</option>
            <option value="worker">A worker offering help</option>
          </select>
        </label>
        {error && <p className="ss-field-error" role="alert">{error}</p>}
        <button className="ss-btn ss-btn-primary ss-auth-submit" type="submit">Create my account <span aria-hidden="true">→</span></button>
      </form>
    </AuthLayout>
  );
}
