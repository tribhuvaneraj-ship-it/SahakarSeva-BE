import { Link } from "react-router-dom";

export default function AuthLayout({ eyebrow, title, description, alternate, children }) {
  return (
    <main className="ss-auth-shell">
      <div className="ss-auth-pattern" aria-hidden="true" />
      <nav className="ss-auth-nav">
        <Link className="ss-home-brand" to="/">
          <span className="ss-home-mark">सह</span>
          <span>SahakarSeva</span>
        </Link>
        <Link className="ss-auth-back" to="/">Back to home <span aria-hidden="true">↗</span></Link>
      </nav>
      <section className="ss-auth-grid">
        <div className="ss-auth-intro">
          <p className="ss-home-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="ss-auth-quote">
            <span className="ss-auth-quote-mark">“</span>
            <p>When neighbours help neighbours, everyday life gets a little lighter.</p>
          </div>
        </div>
        <div className="ss-auth-panel">
          {children}
          <p className="ss-auth-footer">{alternate}</p>
        </div>
      </section>
    </main>
  );
}
