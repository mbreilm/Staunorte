import { MapView } from "@/components/map/MapView";

// Startseite: Vollbild-Karte. Die eigentliche Logik steckt in MapView
// (Client-Komponente, braucht Browser-APIs wie Geolocation und Canvas).
export default function KartePage() {
  return <MapView />;
}
