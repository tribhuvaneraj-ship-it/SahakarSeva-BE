import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/services";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await authApi.login(form.email, form.password);
      const data = response.data;
      const user = data.user ?? data.data?.user;
      login(data.token ?? data.data?.token, user);
      navigate(`/${user.role}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Unable to sign in.");
    }
  }

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      title="Your local network is waiting."
      description="Sign in to keep track of your bookings, messages, and the people helping make them happen."
      alternate={<><span>New to SahakarSeva?</span> <Link to="/register">Create an account</Link></>}
    >
      <div className="ss-auth-heading">
        <h2>Sign in</h2>
        <span className="ss-auth-step">01 / 01</span>
      </div>
      <form className="ss-auth-form" onSubmit={submit}>
        <label className="ss-field">
          Email address
          <input required type="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="ss-field">
          Password
          <input required type="password" placeholder="Enter your password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>
        {error && <p className="ss-field-error" role="alert">{error}</p>}
        <button className="ss-btn ss-btn-primary ss-auth-submit" type="submit">Continue <span aria-hidden="true">→</span></button>
      </form>
    </AuthLayout>
  );
}
