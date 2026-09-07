import { useEffect, useRef, useState, useCallback } from "react";
import { bookingApi } from "../api/services";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";

// Usage: <BookingModal service={service} worker={optionalWorker} onClose={...} onBooked={...} />
export default function BookingModal({ service, worker, onClose, onBooked }) {
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Try to load the map picker. If there's no API key configured, the form
  // still works fully via "Use my location" + a typed address.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setMapReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function reverseGeocode(lat, lng) {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        setAddress(results[0].formatted_address);
      }
    });
  }

  const placeMarker = useCallback((lat, lng) => {
    if (!mapRef.current) return;
    const position = { lat, lng };
    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        draggable: true,
      });
      markerRef.current.addListener("dragend", (e) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setCoords({ lat: newLat, lng: newLng });
        reverseGeocode(newLat, newLng);
      });
    }
    mapRef.current.setCenter(position);
    mapRef.current.setZoom(16);
  }, []);

  // Initialize the map once, after the SDK has loaded and the div exists.
  useEffect(() => {
    if (!mapReady || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: { lat: 19.076, lng: 72.8777 }, // sensible fallback center
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
    });
    geocoderRef.current = new window.google.maps.Geocoder();
    mapRef.current.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCoords({ lat, lng });
      placeMarker(lat, lng);
      reverseGeocode(lat, lng);
    });
  }, [mapReady, placeMarker]);

  // Keep the marker synced whenever coords change (e.g. from GPS).
  useEffect(() => {
    if (coords && mapReady) placeMarker(coords.lat, coords.lng);
  }, [coords, mapReady, placeMarker]);

  function useCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support GPS location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        if (mapReady) reverseGeocode(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Enter your address manually instead."
            : "Couldn't get your location. Enter your address manually instead."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    if (!address.trim()) {
      setSubmitError("Add the address where the work is needed.");
      return;
    }
    if (!scheduledAt) {
      setSubmitError("Pick a date and time for the visit.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        serviceId: service?._id ?? service?.id,
        workerId: worker?._id ?? worker?.id ?? null,
        address,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        scheduledAt,
        notes,
      };
      const res = await bookingApi.create(payload);
      onBooked?.(res.data.booking ?? res.data);
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message || "Couldn't create the booking. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="ss-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ss-modal" role="dialog" aria-modal="true" aria-label="Book a service">
        <div className="ss-modal-header">
          <div>
            <h2>Book {service?.name || "a service"}</h2>
            {worker && <p className="ss-modal-subtitle">with {worker.name}</p>}
          </div>
          <button className="ss-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="ss-modal-body" onSubmit={handleSubmit}>
          <label className="ss-field">
            <span>Where do you need this done?</span>
            <div className="ss-input-row">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House no., street, area, city"
                required
              />
              <button
                type="button"
                className="ss-btn ss-btn-secondary"
                onClick={useCurrentLocation}
                disabled={locating}
              >
                {locating ? "Locating…" : "Use my location"}
              </button>
            </div>
            {locationError && <p className="ss-field-error">{locationError}</p>}
            {coords && (
              <p className="ss-field-hint">
                Pinned at {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
          </label>

          {mapReady && <div className="ss-map-picker" ref={mapDivRef} />}
          {!mapReady && (
            <p className="ss-field-hint">
              Map preview is unavailable — set VITE_GOOGLE_MAPS_API_KEY to enable the
              location picker. You can still book using GPS or a typed address.
            </p>
          )}

          <label className="ss-field">
            <span>Date &amp; time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </label>

          <label className="ss-field">
            <span>Notes for the worker (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="E.g. leaking pipe under the kitchen sink"
            />
          </label>

          {submitError && <p className="ss-field-error">{submitError}</p>}

          <div className="ss-modal-actions">
            <button type="button" className="ss-btn ss-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ss-btn ss-btn-primary" disabled={submitting}>
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
