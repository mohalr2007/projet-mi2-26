// made by larabi
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

type MapDoctor = {
  id: string;
  full_name: string | null;
  specialty: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Leaflet default icon configuration fix for React/Webpack
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function MapComponent({ 
  doctors, 
  userLocation 
}: { 
  doctors: MapDoctor[], 
  userLocation: { lat: number, lng: number } | null 
}) {
  const center = userLocation || { lat: 36.752887, lng: 3.042048 }; // Default Alger

  return (
    <MapContainer 
      center={[center.lat, center.lng] as [number, number]} 
      zoom={userLocation ? 13 : 6} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Position de l'utilisateur (Bleue) */}
      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng] as [number, number]} icon={defaultIcon}>
          <Popup>
            <strong className="text-blue-600">Votre position actuelle</strong> 📍
          </Popup>
        </Marker>
      )}

      {/* Marqueurs des docteurs */}
      {doctors.map((doc) => doc.latitude && doc.longitude ? (
        <Marker 
          key={doc.id} 
          position={[doc.latitude, doc.longitude] as [number, number]} 
          icon={defaultIcon}
        >
          <Popup>
            <div className="flex flex-col gap-1">
               <strong className="text-sm">Dr. {doc.full_name}</strong>
               <span className="text-xs text-slate-500">{doc.specialty}</span>
            </div>
          </Popup>
        </Marker>
      ) : null)}
    </MapContainer>
  );
}
// made by larabi
