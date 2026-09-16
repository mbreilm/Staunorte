"""Baustellen aus OpenStreetMap nach Muenchen importieren.

Filter (mit dem Auftraggeber festgelegt):
  - in OSM in den letzten 180 Tagen bearbeitet
  - Flaeche >= 800 m2
  - benachbarte Teilflaechen (< 150 m) werden zu EINER Baustelle
    zusammengefasst; grosse Projekte sind in OSM oft zerstueckelt

Der Lauf ist wiederholbar: open_data_ort_anlegen() schreibt ueber
(source, external_id) und aktualisiert statt zu verdoppeln.

Aufruf:  python3 scripts-import/osm-import.py [--trocken]
"""
import json, math, os, sys, time, urllib.parse, urllib.request, datetime

MAX_ALTER_TAGE = 180
MIN_FLAECHE_M2 = 800
ZUSAMMEN_M     = 150
UA = "Baustellenjaeger/0.1 (+https://baustellenjaeger.com)"
TROCKEN = "--trocken" in sys.argv

# Muenchen in Kacheln, damit Overpass nicht in den Zeitablauf laeuft.
SUED, NORD, WEST, OST = 48.06, 48.25, 11.36, 11.72
SCHRITT = 0.05


def hole(url, daten=None, kopf=None, timeout=120):
    r = urllib.request.Request(url, data=daten, headers={"User-Agent": UA, **(kopf or {})})
    with urllib.request.urlopen(r, timeout=timeout) as a:
        return json.loads(a.read().decode())


def overpass(sued, nord, west, ost):
    q = (f'[out:json][timeout:90];('
         f'way["landuse"="construction"]({sued},{west},{nord},{ost});'
         f'way["building"="construction"]({sued},{west},{nord},{ost}););'
         f'out geom tags meta;')
    d = urllib.parse.urlencode({"data": q}).encode()
    return hole("https://overpass-api.de/api/interpreter", d)["elements"]


def flaeche_m2(g):
    lat0 = sum(p["lat"] for p in g) / len(g)
    mx, my = 111320 * math.cos(math.radians(lat0)), 110540
    p = [(q["lon"] * mx, q["lat"] * my) for q in g]
    return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1]
                   for i in range(len(p)))) / 2


def meter(a, b):
    return math.hypot((a["lat"] - b["lat"]) * 110540,
                      (a["lon"] - b["lon"]) * 111320 * math.cos(math.radians(48.14)))


def strasse(lat, lon):
    """Strassenname fuer den Titel. Nominatim erlaubt 1 Anfrage/Sekunde."""
    try:
        d = hole("https://nominatim.openstreetmap.org/reverse?format=jsonv2"
                 f"&lat={lat}&lon={lon}", timeout=15)
        a = d.get("address", {})
        return a.get("road") or a.get("pedestrian") or a.get("suburb")
    except Exception:
        return None


def main():
    heute = datetime.date.today()
    roh, gesehen = [], set()
    kacheln = [(s, s + SCHRITT, w, w + SCHRITT)
               for s in [SUED + i * SCHRITT for i in range(int((NORD - SUED) / SCHRITT) + 1)]
               for w in [WEST + i * SCHRITT for i in range(int((OST - WEST) / SCHRITT) + 1)]]
    print(f"{len(kacheln)} Kacheln", flush=True)

    for i, (s, n, w, o) in enumerate(kacheln, 1):
        for versuch in range(3):
            try:
                els = overpass(s, n, w, o); break
            except Exception as e:
                if versuch == 2:
                    print(f"  Kachel {i} uebersprungen: {e}"); els = []
                else:
                    time.sleep(15 * (versuch + 1))
        for e in els:
            if e["id"] in gesehen:
                continue
            gesehen.add(e["id"])
            g, ts = e.get("geometry"), e.get("timestamp", "")[:10]
            if not g or len(g) < 3 or not ts:
                continue
            alter = (heute - datetime.date.fromisoformat(ts)).days
            f = flaeche_m2(g)
            if alter > MAX_ALTER_TAGE or f < MIN_FLAECHE_M2:
                continue
            roh.append({"id": e["id"], "lat": sum(p["lat"] for p in g) / len(g),
                        "lon": sum(p["lon"] for p in g) / len(g), "f": f,
                        "alter": alter, "name": (e.get("tags") or {}).get("name")})
        time.sleep(4)
        if i % 10 == 0:
            print(f"  {i}/{len(kacheln)} Kacheln, {len(roh)} Treffer", flush=True)

    print(f"\n{len(roh)} Flaechen nach Filter", flush=True)

    # Teilflaechen zusammenfassen
    rest, gruppen = roh[:], []
    while rest:
        k = [rest.pop()]
        aenderung = True
        while aenderung:
            aenderung = False
            for x in rest[:]:
                if any(meter(x, y) < ZUSAMMEN_M for y in k):
                    k.append(x); rest.remove(x); aenderung = True
        gruppen.append(k)
    print(f"{len(gruppen)} Baustellen nach Zusammenfassung", flush=True)

    # Je Gruppe ein Ort: groesste Teilflaeche gibt Mittelpunkt und Kennung
    orte = []
    for k in gruppen:
        haupt = max(k, key=lambda x: x["f"])
        name = next((x["name"] for x in sorted(k, key=lambda x: -x["f"]) if x["name"]), None)
        orte.append({"external_id": f"osm:way:{haupt['id']}", "lat": haupt["lat"],
                     "lon": haupt["lon"], "name": name,
                     "flaeche": round(sum(x["f"] for x in k)), "teile": len(k)})

    if TROCKEN:
        print("\nTrockenlauf - nichts geschrieben. Erste 10:")
        for o in sorted(orte, key=lambda x: -x["flaeche"])[:10]:
            print(f"  {o['flaeche']:8d} m2  {o['teile']} Teil(e)  {o['name'] or '(ohne Namen)'}")
        return

    url = os.environ["SUPABASE_URL"]; key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    neu = fehler = 0
    for i, o in enumerate(orte, 1):
        titel = o["name"]
        if not titel:
            s = strasse(o["lat"], o["lon"]); time.sleep(1.1)
            titel = f"Baustelle {s}" if s else "Baustelle"
        titel = titel[:120]
        koerper = json.dumps({
            "p_external_id": o["external_id"], "p_title": titel,
            "p_lat": o["lat"], "p_lon": o["lon"],
            "p_note": f"Aus OpenStreetMap übernommen, noch von niemandem bestätigt. "
                      f"Fläche etwa {o['flaeche']} m².",
        }).encode()
        try:
            hole(f"{url}/rest/v1/rpc/open_data_ort_anlegen", koerper,
                 {"apikey": key, "Authorization": f"Bearer {key}",
                  "Content-Type": "application/json"}, timeout=30)
            neu += 1
        except Exception as e:
            fehler += 1
            print(f"  FEHLER bei {o['external_id']}: {e}")
        if i % 25 == 0:
            print(f"  {i}/{len(orte)} geschrieben", flush=True)

    print(f"\nFertig: {neu} Orte geschrieben, {fehler} Fehler")


main()
