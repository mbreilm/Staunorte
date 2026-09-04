// Deep-Link für den "Route öffnen"-Button: auf iOS Apple Maps, sonst
// Google Maps. Beides über Web-URLs (nicht "maps://"), damit der Link
// auch dann funktioniert, wenn keine native App-Weiterleitung greift.
export function buildRouteUrl(lat: number, lon: number): string {
  const istIOS =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return istIOS
    ? `https://maps.apple.com/?daddr=${lat},${lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}
