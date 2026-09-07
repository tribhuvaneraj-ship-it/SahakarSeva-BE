import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function BookingMap({ destination, worker }) {
  const center = destination || { lat: 19.2437, lng: 73.1305 };

  return (
    <div className="ss-booking-map">
      <MapContainer center={[center.lat, center.lng]} zoom={14} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker center={[center.lat, center.lng]} radius={9} pathOptions={{ color: "#143f3c", fillColor: "#e2963b", fillOpacity: 1 }}>
          <Popup>Service location</Popup>
        </CircleMarker>
        {worker && (
          <CircleMarker center={[worker.lat, worker.lng]} radius={8} pathOptions={{ color: "#1f5f5b", fillColor: "#1f5f5b", fillOpacity: 0.9 }}>
            <Popup>Worker location</Popup>
          </CircleMarker>
        )}
      </MapContainer>
      <div className="ss-map-legend">
        <span><i className="ss-map-dot ss-map-dot-customer" />Service location</span>
        {worker && <span><i className="ss-map-dot ss-map-dot-worker" />Worker</span>}
      </div>
    </div>
  );
}
