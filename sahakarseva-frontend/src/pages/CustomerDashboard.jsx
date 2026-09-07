import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import BookingModal from "../components/BookingModal";
import WorkerMap from "../components/WorkerMap";
import { serviceApi, bookingApi, workerApi } from "../api/services";
import { useAuth } from "../context/AuthContext";

const STATUS_LABELS = {
  pending: "Waiting for a worker",
  accepted: "Worker on the way",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Declined",
  cancelled: "Cancelled",
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState(() => {
    const saved = user?.location?.coordinates;
    return saved?.length === 2 ? { lng: saved[0], lat: saved[1] } : { lng: 73.1305, lat: 19.2437 };
  });
  const [workers, setWorkers] = useState([]);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [activeService, setActiveService] = useState(null);

  const loadBookings = useCallback(() => {
    setBookingsLoading(true);
    bookingApi
      .myBookings()
      .then((res) => {
        const body = res.data;
        setBookings(body.data?.bookings ?? body.bookings ?? (Array.isArray(body) ? body : []));
      })
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  }, []);

  useEffect(() => {
    loadBookings();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [loadBookings]);

  useEffect(() => {
    if (!coords) return;
    workerApi
      .nearby({ lat: coords.lat, lng: coords.lng, radiusKm: 15 })
      .then((res) => setWorkers(res.data.workers ?? res.data.data?.workers ?? []))
      .catch(() => setWorkers([]));
  }, [coords]);

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    setSearchError("");
    try {
      const res = await serviceApi.search({
        q: query || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      setResults(res.data.services ?? res.data ?? []);
    } catch {
      setSearchError("Couldn't load services right now. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function handleBooked() {
    setActiveService(null);
    loadBookings();
  }

  return (
    <DashboardLayout title="Find services near you">
      <section className="ss-card ss-location-card">
        <div className="ss-location-heading">
          <div>
            <p className="ss-home-section-label">LIVE LOCAL NETWORK</p>
            <h2>People ready to help nearby</h2>
            <p className="ss-field-hint">Seeded workers are shown around your saved Kalyan location. Allow browser location to update the map.</p>
          </div>
          <span className="ss-location-count">{workers.length} online</span>
        </div>
        <WorkerMap center={coords} workers={workers} />
      </section>
      <section className="ss-card">
        <form className="ss-search-row" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Plumber, electrician, home cleaning…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="ss-btn ss-btn-primary" type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
        {!coords && (
          <p className="ss-field-hint">
            Turn on location access to see workers ranked by distance from you.
          </p>
        )}
        {searchError && <p className="ss-field-error">{searchError}</p>}

        <div className="ss-grid">
          {results.map((service) => (
            <article className="ss-service-card" key={service._id ?? service.id}>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div className="ss-service-meta">
                <span>{service.category}</span>
                {typeof service.distanceKm === "number" && (
                  <span>{service.distanceKm.toFixed(1)} km away</span>
                )}
                {service.startingPrice && <span>From ₹{service.startingPrice}</span>}
              </div>
              <button
                className="ss-btn ss-btn-secondary"
                onClick={() => setActiveService(service)}
              >
                Book now
              </button>
            </article>
          ))}
          {!searching && results.length === 0 && (
            <p className="ss-empty">Search for a service to see available workers.</p>
          )}
        </div>
      </section>

      <section className="ss-card">
        <h2>My bookings</h2>
        {bookingsLoading && <p className="ss-empty">Loading your bookings…</p>}
        {!bookingsLoading && bookings.length === 0 && (
          <p className="ss-empty">You haven't booked anything yet.</p>
        )}
        <ul className="ss-booking-list">
          {bookings.map((b) => (
            <li key={b._id ?? b.id} className="ss-booking-row">
              <div>
                <strong>{b.service?.name || b.serviceName}</strong>
                <span className={`ss-badge ss-badge-${b.status}`}>
                  {STATUS_LABELS[b.status] || b.status}
                </span>
              </div>
              <span>{new Date(b.scheduledAt).toLocaleString()}</span>
              <Link className="ss-btn ss-btn-ghost" to={`/bookings/${b._id ?? b.id}`}>
                Track
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {activeService && (
        <BookingModal
          service={activeService}
          onClose={() => setActiveService(null)}
          onBooked={handleBooked}
        />
      )}
    </DashboardLayout>
  );
}
