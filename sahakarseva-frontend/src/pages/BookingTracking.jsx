import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import BookingMap from "../components/BookingMap";
import { bookingApi } from "../api/services";
import { useSocket } from "../context/SocketContext";

const STEPS = ["pending", "accepted", "in_progress", "completed"];

export default function BookingTracking() {
  const { id } = useParams();
  const { socket } = useSocket();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [workerPos, setWorkerPos] = useState(null);

  useEffect(() => {
    bookingApi
      .detail(id)
      .then((res) => setBooking(res.data.booking ?? res.data))
      .catch(() => setError("Couldn't load this booking."));
  }, [id]);

  // Join a per-booking room so we only receive this job's location/status pushes.
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("booking:join", { bookingId: id });

    function onLocation(payload) {
      if (payload.bookingId !== id) return;
      const [lng, lat] = payload.coordinates || [];
      if (typeof lat === "number" && typeof lng === "number") setWorkerPos({ lat, lng });
      else if (typeof payload.lat === "number" && typeof payload.lng === "number") setWorkerPos({ lat: payload.lat, lng: payload.lng });
    }
    function onStatus(payload) {
      const bookingId = payload.bookingId || payload._id;
      if (String(bookingId) === String(id) && payload.status) setBooking((prev) => (prev ? { ...prev, status: payload.status } : prev));
    }

    socket.on("booking:locationUpdate", onLocation);
    socket.on("tracking:worker_location", onLocation);
    socket.on("booking:statusChanged", onStatus);
    socket.on("booking:updated", onStatus);
    return () => {
      socket.emit("booking:leave", { bookingId: id });
      socket.off("booking:locationUpdate", onLocation);
      socket.off("tracking:worker_location", onLocation);
      socket.off("booking:statusChanged", onStatus);
      socket.off("booking:updated", onStatus);
    };
  }, [socket, id]);

  if (error) {
    return (
      <DashboardLayout title="Booking">
        <p className="ss-field-error">{error}</p>
        <Link className="ss-btn ss-btn-ghost" to="/">
          Back to dashboard
        </Link>
      </DashboardLayout>
    );
  }

  if (!booking) {
    return (
      <DashboardLayout title="Booking">
        <p className="ss-empty">Loading booking…</p>
      </DashboardLayout>
    );
  }

  const stepIndex = booking.status === "on_the_way" || booking.status === "arrived"
    ? STEPS.indexOf("accepted")
    : STEPS.indexOf(booking.status);
  const coordinates = booking.pickupLocation?.coordinates || [];
  const destination = coordinates.length === 2
    ? { lng: coordinates[0], lat: coordinates[1] }
    : { lng: 73.1305, lat: 19.2437 };

  return (
    <DashboardLayout title={booking.service?.name || "Booking"}>
      <section className="ss-card">
        <div className="ss-timeline">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`ss-timeline-step ${i < stepIndex ? "ss-timeline-step-done" : ""} ${i === stepIndex ? "ss-timeline-step-current" : ""}`}
              aria-current={i === stepIndex ? "step" : undefined}
            >
              <span className="ss-timeline-dot" />
              <span>{step.replace("_", " ")}{i === stepIndex && <small>now</small>}</span>
            </div>
          ))}
        </div>
        {["rejected", "cancelled"].includes(booking.status) && (
          <p className={`ss-badge ss-badge-${booking.status}`}>{booking.status}</p>
        )}
      </section>

      <section className="ss-card ss-detail-grid">
        <div>
          <h2>Details</h2>
          <p>
            <strong>Address:</strong> {booking.address || booking.pickupLocation?.address || "Saved service location"}
          </p>
          <p>
            <strong>Scheduled:</strong> {new Date(booking.scheduledAt).toLocaleString()}
          </p>
          {booking.notes && (
            <p>
              <strong>Notes:</strong> {booking.notes}
            </p>
          )}
          {booking.worker && (
            <p>
              <strong>Worker:</strong> {booking.worker.name} ({booking.worker.phone || "—"})
            </p>
          )}
        </div>
        <div>
          <BookingMap destination={destination} worker={workerPos} />
          {workerPos && <p className="ss-field-hint">Worker location updating live.</p>}
        </div>
      </section>
    </DashboardLayout>
  );
}
