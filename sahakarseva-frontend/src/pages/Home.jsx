import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="ss-home">
      <nav className="ss-home-nav">
        <Link className="ss-home-brand" to="/">
          <span className="ss-home-mark">सह</span>
          <span>SahakarSeva</span>
        </Link>
        <div className="ss-home-nav-actions">
          <Link className="ss-home-signin" to="/login">Sign in</Link>
          <Link className="ss-btn ss-btn-secondary" to="/register">Join the network</Link>
        </div>
      </nav>

      <section className="ss-home-hero">
        <div className="ss-home-copy">
          <p className="ss-home-kicker">COMMUNITY SERVICES, MADE SIMPLE</p>
          <h1>Good help is closer than you think.</h1>
          <p className="ss-home-lede">
            Find dependable local workers, book in a few steps, and stay connected from request to completion.
          </p>
          <div className="ss-home-actions">
            <Link className="ss-btn ss-btn-primary" to="/register">Find a service <span aria-hidden="true">↗</span></Link>
            <Link className="ss-home-text-link" to="/login">I already have an account</Link>
          </div>
        </div>
        <div className="ss-home-illustration" aria-label="A local service booking summary">
          <div className="ss-home-orbit ss-home-orbit-one" />
          <div className="ss-home-orbit ss-home-orbit-two" />
          <div className="ss-home-note">
            <span className="ss-home-note-icon">✓</span>
            <div>
              <strong>Cleaner booked</strong>
              <small>Arriving today, 10:30 AM</small>
            </div>
          </div>
          <div className="ss-home-pin">सह</div>
          <div className="ss-home-location">Your neighbourhood<br /><strong>is in good hands.</strong></div>
        </div>
      </section>

      <section className="ss-home-lower">
        <div>
          <p className="ss-home-section-label">WHAT CAN WE HELP WITH?</p>
          <h2>Everyday jobs. Trusted people.</h2>
        </div>
        <div className="ss-home-services">
          <span>Home repairs</span>
          <span>Cleaning</span>
          <span>Moving help</span>
          <span>Personal care</span>
        </div>
      </section>

      <footer className="ss-home-footer">
        <span><strong>4.9/5</strong> average service rating</span>
        <span><strong>Local first</strong> cooperative workers</span>
        <span><strong>Real-time</strong> booking updates</span>
      </footer>
    </main>
  );
}
