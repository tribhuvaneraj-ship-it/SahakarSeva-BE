import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { bookingApi, workerApi } from "../api/services";
import { useSocket } from "../context/SocketContext";

export default function WorkerDashboard() {
  const { socket } = useSocket();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [actionError, setActionError] = useState("");
  const watchIdRef = useRef(null);

  const loadJobs = useCallback(() => {
    setLoading(true);
    bookingApi
      .workerJobs()
      .then((res) => {
        const body = res.data;
        setJobs(body.data?.bookings ?? body.bookings ?? (Array.isArray(body) ? body : []));
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Live-refresh when the server pushes a new job request or a status change.
  useEffect(() => {
    if (!socket) return;
    socket.on("booking:new", loadJobs);
    socket.on("booking:statusChanged", loadJobs);
    return () => {
      socket.off("booking:new", loadJobs);
      socket.off("booking:statusChanged", loadJobs);
    };
  }, [socket, loadJobs]);

  function stopSharingLocation() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  function startSharingLocation() {
    if (!navigator.geolocation) {
      setLocationError("This browser doesn't support GPS location sharing.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        workerApi.updateLocation(latitude, longitude).catch(() => {});
        socket?.emit("worker:location_update", { lat: latitude, lng: longitude });
      },
      () => {
        setLocationError("Location access was denied — customers won't see live tracking.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  useEffect(() => stopSharingLocation, []);

  async function toggleAvailability() {
    const next = !available;
    setLocationError("");
    try {
      await workerApi.toggleAvailability(next);
      setAvailable(next);
    } catch {
      setActionError("Couldn't update your availability. Try again.");
      return;
    }
    if (next) startSharingLocation();
    else stopSharingLocation();
    socket?.emit(next ? "worker:start_sharing" : "worker:stop_sharing");
  }

  async function respond(id, action) {
    setActionError("");
    try {
      if (action === "accept") await bookingApi.accept(id);
      else await bookingApi.reject(id);
      loadJobs();
    } catch {
      setActionError("Couldn't update that job. Try again.");
    }
  }

  async function updateStatus(id, status) {
    setActionError("");
    try {
      await bookingApi.updateStatus(id, status);
      loadJobs();
    } catch {
      setActionError("Couldn't update the job status. Try again.");
    }
  }

  const pending = jobs.filter((j) => j.status === "pending");
  const active = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status));

  return (
    <DashboardLayout title="Job requests">
      <section className="ss-card ss-availability-card">
        <div>
          <h2>Availability</h2>
          <p className="ss-field-hint">
            Turn this on to receive job requests and share your live location with
            customers while a job is active.
          </p>
          {locationError && <p className="ss-field-error">{locationError}</p>}
        </div>
        <button
          className={`ss-toggle ${available ? "ss-toggle-on" : ""}`}
          onClick={toggleAvailability}
          role="switch"
          aria-checked={available}
        >
          <span className="ss-toggle-knob" />
        </button>
      </section>

      {actionError && <p className="ss-field-error">{actionError}</p>}

      <section className="ss-card">
        <h2>New requests</h2>
        {loading && <p className="ss-empty">Loading…</p>}
        {!loading && pending.length === 0 && (
          <p className="ss-empty">No new job requests right now.</p>
        )}
        <ul className="ss-booking-list">
          {pending.map((job) => (
            <li key={job._id ?? job.id} className="ss-booking-row">
              <div>
                <strong>{job.service?.name || job.serviceName}</strong>
                <span>{job.address}</span>
              </div>
              <span>{new Date(job.scheduledAt).toLocaleString()}</span>
              <div className="ss-row-actions">
                <button
                  className="ss-btn ss-btn-primary"
                  onClick={() => respond(job._id ?? job.id, "accept")}
                >
                  Accept
                </button>
                <button
                  className="ss-btn ss-btn-danger"
                  onClick={() => respond(job._id ?? job.id, "reject")}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="ss-card">
        <h2>Active jobs</h2>
        {!loading && active.length === 0 && <p className="ss-empty">No active jobs.</p>}
        <ul className="ss-booking-list">
          {active.map((job) => (
            <li key={job._id ?? job.id} className="ss-booking-row">
              <div>
                <strong>{job.service?.name || job.serviceName}</strong>
                <span className={`ss-badge ss-badge-${job.status}`}>{job.status}</span>
              </div>
              <span>{job.address}</span>
              <div className="ss-row-actions">
                {job.status === "accepted" && (
                  <button
                    className="ss-btn ss-btn-secondary"
                    onClick={() => updateStatus(job._id ?? job.id, "in_progress")}
                  >
                    Start job
                  </button>
                )}
                {job.status === "in_progress" && (
                  <button
                    className="ss-btn ss-btn-primary"
                    onClick={() => updateStatus(job._id ?? job.id, "completed")}
                  >
                    Mark complete
                  </button>
                )}
                <Link className="ss-btn ss-btn-ghost" to={`/bookings/${job._id ?? job.id}`}>
                  Details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </DashboardLayout>
  );
}
