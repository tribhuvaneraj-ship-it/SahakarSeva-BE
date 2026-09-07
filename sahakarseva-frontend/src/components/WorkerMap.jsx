import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function WorkerMap({ center, workers = [] }) {
  const mapCenter = [center.lat, center.lng];

  return (
    <div className="ss-worker-map">
      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker center={mapCenter} radius={9} pathOptions={{ color: "#143f3c", fillColor: "#e2963b", fillOpacity: 1 }}>
          <Popup>Your saved location</Popup>
        </CircleMarker>
        {workers.map((item) => {
          const [lng, lat] = item.currentLocation?.coordinates || [];
          if (typeof lat !== "number" || typeof lng !== "number") return null;
          return (
            <CircleMarker key={String(item.worker?._id || item.workerProfileId)} center={[lat, lng]} radius={8} pathOptions={{ color: "#1f5f5b", fillColor: "#1f5f5b", fillOpacity: 0.9 }}>
              <Popup>
                <strong>{item.worker?.name || "Available worker"}</strong>
                <br />
                {item.distanceKm} km away
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="ss-map-legend">
        <span><i className="ss-map-dot ss-map-dot-customer" />You</span>
        <span><i className="ss-map-dot ss-map-dot-worker" />Available workers ({workers.length})</span>
      </div>
    </div>
  );
}
