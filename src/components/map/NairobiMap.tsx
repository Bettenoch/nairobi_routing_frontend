// src/components/map/NairobiMap.tsx — FIXED
// Fix 1: Driver hover popup and CompletionRouteLegend now read live
//         driver.deliveries_completed correctly (the field is guaranteed
//         to be a number after DRIVER_ASSIGNED initialises it to 0).
// Fix 2: LegendToggleBar + MapLegend are the ONLY legend on the map —
//         MapHUD no longer renders a duplicate legend.
// Fix 3: Bottom positioning adjusted so toggle buttons don't overlap the
//         Mapbox navigation controls.

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import {
  MAPBOX_TOKEN,
  MAPBOX_STYLE,
  INITIAL_VIEWPORT,
} from "@/constants/mapConfig";
import { useSimulationStore } from "@/store/simulationStore";
import { useMapStore } from "@/store/mapStore";
import { useUIStore } from "@/store/uiStore";

mapboxgl.accessToken = MAPBOX_TOKEN;

const LAYER_CLUSTER_CIRCLES = "cluster-circles";
const LAYER_ROUTE_GLOW      = "route-lines-glow";
const LAYER_ROUTE_BASE      = "route-lines";
const LAYER_TRAIL_GLOW      = "trail-glow";
const LAYER_TRAIL_BASE      = "trail-base";
const LAYER_TRAIL_DOTS      = "trail-dots";

const SOURCE_CLUSTERS = "clusters";
const SOURCE_ROUTES   = "routes";
const SOURCE_TRAILS   = "trails";

type ToggleFeature = "orders" | "drivers" | "clusters" | "routes" | "trails" | "restaurants";

function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) &&
    !(lat === 0 && lon === 0) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  );
}

function isValidLineString(geojson: unknown): boolean {
  if (!geojson || typeof geojson !== "object") return false;
  const g = geojson as Record<string, unknown>;
  const geometry = g.geometry as Record<string, unknown> | undefined;
  if (!geometry) return false;
  const coords = geometry.coordinates as [number, number][] | undefined;
  if (!Array.isArray(coords) || coords.length < 2) return false;
  for (const c of [coords[0], coords[coords.length - 1]]) {
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) ||
      (c[0] === 0 && c[1] === 0)) return false;
  }
  return true;
}

function stableKeys(obj: Record<string, unknown>): string {
  return Object.keys(obj).sort().join(",");
}

function ToggleButton({
  label, icon, active, onClick, color,
}: { label: string; icon: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      title={`Toggle ${label}`}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 6,
        border: `1px solid ${active ? color + "60" : "#1e3a5f"}`,
        background: active ? `${color}18` : "rgba(8,12,24,0.6)",
        cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 9,
        color: active ? color : "#3a6080", letterSpacing: "0.08em",
        transition: "all 0.2s", whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 11 }}>{icon}</span>
      {label.toUpperCase()}
      <div style={{
        width: 4, height: 4, borderRadius: "50%",
        background: active ? color : "#1e3a5f",
        boxShadow: active ? `0 0 6px ${color}` : "none",
        marginLeft: 2, flexShrink: 0,
      }} />
    </button>
  );
}

function MapToggleControls({
  visibility, onToggle,
}: { visibility: Record<ToggleFeature, boolean>; onToggle: (f: ToggleFeature) => void }) {
  const TOGGLES: { id: ToggleFeature; label: string; icon: string; color: string }[] = [
    { id: "restaurants", label: "Restaurants", icon: "🏪", color: "#ff9500" },
    { id: "orders",      label: "Orders",      icon: "📦", color: "#00ccff" },
    { id: "drivers",     label: "Drivers",     icon: "🛵", color: "#7fff00" },
    { id: "clusters",    label: "Clusters",    icon: "⬡",  color: "#ffaa00" },
    { id: "routes",      label: "Routes",      icon: "〰", color: "#4ECDC4" },
    { id: "trails",      label: "Trails",      icon: "✦",  color: "#DDA0DD" },
  ];
  return (
    <div className="absolute" style={{
      top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10,
      display: "flex", gap: 6,
      background: "rgba(8,12,24,0.88)", border: "1px solid rgba(0,204,255,0.15)",
      borderRadius: 10, padding: "6px 8px", backdropFilter: "blur(12px)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    }}>
      {TOGGLES.map((t) => (
        <ToggleButton key={t.id} label={t.label} icon={t.icon}
          active={visibility[t.id]} onClick={() => onToggle(t.id)} color={t.color} />
      ))}
    </div>
  );
}

// ── Legend toggle buttons — sit just above the map legend ─────────────────────
function LegendToggleBar({
  showMapLegend, showRouteLegend,
  onToggleMapLegend, onToggleRouteLegend,
}: {
  showMapLegend: boolean; showRouteLegend: boolean;
  onToggleMapLegend: () => void; onToggleRouteLegend: () => void;
}) {
  return (
    <div className="absolute" style={{
      // Sits just above the Mapbox nav controls (bottom-right) but on the left
      bottom: 10, left: 8, zIndex: 10,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <button
        onClick={onToggleMapLegend}
        title="Toggle map legend"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 8px", borderRadius: 5,
          border: `1px solid ${showMapLegend ? "rgba(0,204,255,0.4)" : "#1e3a5f"}`,
          background: showMapLegend ? "rgba(0,204,255,0.1)" : "rgba(8,12,24,0.8)",
          cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 8,
          color: showMapLegend ? "#00ccff" : "#3a6080",
          letterSpacing: "0.08em", transition: "all 0.2s",
        }}
      >
        {showMapLegend ? "▼" : "▶"} MAP LEGEND
      </button>
      <button
        onClick={onToggleRouteLegend}
        title="Toggle route legend"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 8px", borderRadius: 5,
          border: `1px solid ${showRouteLegend ? "rgba(0,204,255,0.4)" : "#1e3a5f"}`,
          background: showRouteLegend ? "rgba(0,204,255,0.1)" : "rgba(8,12,24,0.8)",
          cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 8,
          color: showRouteLegend ? "#00ccff" : "#3a6080",
          letterSpacing: "0.08em", transition: "all 0.2s",
        }}
      >
        {showRouteLegend ? "▼" : "▶"} ROUTE LEGEND
      </button>
    </div>
  );
}

export default function NairobiMap() {
  const mapContainer     = useRef<HTMLDivElement>(null);
  const map              = useRef<mapboxgl.Map | null>(null);
  const markersRef       = useRef<Record<string, mapboxgl.Marker>>({});
  const driverMarkersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const restaurantMarkersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const popupRef         = useRef<mapboxgl.Popup | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [visibility, setVisibility] = useState<Record<ToggleFeature, boolean>>({
    orders: true, drivers: true, clusters: true,
    routes: true, trails: true, restaurants: true,
  });
  const [showMapLegend, setShowMapLegend]     = useState(true);
  const [showRouteLegend, setShowRouteLegend] = useState(true);

  const { orders, clusters, routes, status, drivers } = useSimulationStore();
  const {
    driverPositions, deliveredOrderIds, driverTrails,
    restaurantMarkers,
  } = useMapStore();
  const { openDrawer } = useUIStore();

  const isCompleted = status === "completed";

  const handleToggle = useCallback((feature: ToggleFeature) => {
    setVisibility((prev) => ({ ...prev, [feature]: !prev[feature] }));
  }, []);

  // Apply layer visibility
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const lv = (v: boolean) => (v ? "visible" : "none") as "visible" | "none";
    if (m.getLayer(LAYER_CLUSTER_CIRCLES)) m.setLayoutProperty(LAYER_CLUSTER_CIRCLES, "visibility", lv(visibility.clusters));
    if (m.getLayer(LAYER_ROUTE_GLOW)) m.setLayoutProperty(LAYER_ROUTE_GLOW, "visibility", lv(visibility.routes));
    if (m.getLayer(LAYER_ROUTE_BASE)) m.setLayoutProperty(LAYER_ROUTE_BASE, "visibility", lv(visibility.routes));
    if (m.getLayer(LAYER_TRAIL_GLOW)) m.setLayoutProperty(LAYER_TRAIL_GLOW, "visibility", lv(visibility.trails));
    if (m.getLayer(LAYER_TRAIL_BASE)) m.setLayoutProperty(LAYER_TRAIL_BASE, "visibility", lv(visibility.trails));
    if (m.getLayer(LAYER_TRAIL_DOTS)) m.setLayoutProperty(LAYER_TRAIL_DOTS, "visibility", lv(visibility.trails));
  }, [visibility, mapReady]);

  useEffect(() => {
    Object.values(markersRef.current).forEach((m) => {
      m.getElement().style.display = visibility.orders ? "" : "none";
    });
  }, [visibility.orders]);

  useEffect(() => {
    Object.values(driverMarkersRef.current).forEach((m) => {
      m.getElement().style.display = visibility.drivers ? "" : "none";
    });
  }, [visibility.drivers]);

  useEffect(() => {
    Object.values(restaurantMarkersRef.current).forEach((m) => {
      m.getElement().style.display = visibility.restaurants ? "" : "none";
    });
  }, [visibility.restaurants]);

  const showPopup = useCallback((lngLat: mapboxgl.LngLatLike, html: string) => {
    popupRef.current?.remove();
    popupRef.current = new mapboxgl.Popup({
      closeButton: false, closeOnClick: true, maxWidth: "260px", offset: 14,
    }).setLngLat(lngLat).setHTML(html).addTo(map.current!);
  }, []);

  // ResizeObserver — map fills full width when sidebar collapses
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      if (map.current) map.current.resize();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Init map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: [INITIAL_VIEWPORT.longitude, INITIAL_VIEWPORT.latitude],
      zoom: INITIAL_VIEWPORT.zoom, pitch: INITIAL_VIEWPORT.pitch,
      bearing: INITIAL_VIEWPORT.bearing, antialias: true, fadeDuration: 0,
    });
    map.current = m;
    m.on("load", () => {
      m.setFog({ color: "#050810", "high-color": "#0d1424", "horizon-blend": 0.05, "space-color": "#000000", "star-intensity": 0.6 });
      m.addSource(SOURCE_CLUSTERS, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource(SOURCE_ROUTES,   { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource(SOURCE_TRAILS,   { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      m.addLayer({ id: LAYER_CLUSTER_CIRCLES, type: "circle", source: SOURCE_CLUSTERS, paint: { "circle-radius": 60, "circle-color": ["get", "color"], "circle-opacity": 0.06, "circle-stroke-width": 1, "circle-stroke-color": ["get", "color"], "circle-stroke-opacity": 0.25 } });
      m.addLayer({ id: LAYER_ROUTE_GLOW, type: "line", source: SOURCE_ROUTES, paint: { "line-color": ["get", "color"], "line-width": ["case", ["boolean", ["get", "completed"], false], 10, 8], "line-opacity": ["case", ["boolean", ["get", "completed"], false], 0.3, 0.1], "line-blur": 8 }, layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: LAYER_ROUTE_BASE, type: "line", source: SOURCE_ROUTES, paint: { "line-color": ["get", "color"], "line-width": ["case", ["boolean", ["get", "completed"], false], 2.5, 1.5], "line-opacity": ["case", ["boolean", ["get", "completed"], false], 0.9, 0.28] }, layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: LAYER_TRAIL_GLOW, type: "line", source: SOURCE_TRAILS, filter: ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "isActive"], true]], paint: { "line-color": ["get", "color"], "line-width": 18, "line-opacity": 0.18, "line-blur": 12 }, layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: LAYER_TRAIL_BASE, type: "line", source: SOURCE_TRAILS, filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": ["get", "color"], "line-width": ["case", ["boolean", ["get", "isActive"], false], 3.5, 2], "line-opacity": ["case", ["boolean", ["get", "isActive"], false], 1.0, 0.6] }, layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: LAYER_TRAIL_DOTS, type: "circle", source: SOURCE_TRAILS, filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "isActive"], true]], paint: { "circle-radius": 7, "circle-color": ["get", "color"], "circle-opacity": 1.0, "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff", "circle-stroke-opacity": 0.85 } });
      m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
      m.on("click", () => popupRef.current?.remove());
      m.once("idle", () => setMapReady(true));
    });
    return () => { popupRef.current?.remove(); setMapReady(false); };
  }, []); // eslint-disable-line

  // ── Restaurant markers ─────────────────────────────────────────────────────
  const restSignature = Object.keys(restaurantMarkers).sort().join(",");
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    Object.entries(restaurantMarkers).forEach(([id, rest]) => {
      if (!isValidCoord(rest.lat, rest.lon)) return;
      if (restaurantMarkersRef.current[id]) return;

      const el = document.createElement("div");
      el.style.cssText = [
        "width:32px", "height:32px", "border-radius:8px",
        "background:rgba(255,149,0,0.2)", "border:2px solid #ff9500",
        "display:flex", "align-items:center", "justify-content:center",
        "font-size:16px", "cursor:pointer",
        "box-shadow:0 0 12px rgba(255,149,0,0.5)",
        "transition:transform 0.15s ease",
      ].join(";");
      el.textContent = "🏪";
      el.style.display = visibility.restaurants ? "" : "none";

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
        showPopup([rest.lon, rest.lat], `
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e8f4fd;line-height:1.7">
            <div style="font-size:10px;color:#ff9500;letter-spacing:.1em;margin-bottom:4px">🏪 RESTAURANT</div>
            <div style="color:#ff9500;font-weight:700;font-size:13px">${rest.name}</div>
            <div style="color:#7fb3d0">📍 ${rest.zone}</div>
            <div style="color:#3a6080;font-size:9px;margin-top:2px">Order source location</div>
          </div>
        `);
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([rest.lon, rest.lat])
        .addTo(m);
      restaurantMarkersRef.current[id] = marker;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restSignature, mapReady, showPopup, visibility.restaurants]);

  // Order markers
  const orderIds = Object.keys(orders).sort().join(",");
  const deliveredCount = deliveredOrderIds.size;
  const clusterKeys = stableKeys(clusters as Record<string, unknown>);

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    Object.values(orders).forEach((order) => {
      if (!isValidCoord(order.lat, order.lon)) return;
      const isDelivered  = deliveredOrderIds.has(order.id);
      const clusterColor = order.cluster_id ? clusters[order.cluster_id]?.color : null;
      const activeColor  = clusterColor ?? "#00ccff";
      const visible      = visibility.orders;

      if (markersRef.current[order.id]) {
        const el = markersRef.current[order.id].getElement();
        el.style.background  = isDelivered ? "#7fff00" : `${activeColor}44`;
        el.style.borderColor = isDelivered ? "#7fff00" : activeColor;
        el.style.boxShadow   = isDelivered ? "0 0 12px #7fff00" : "none";
        el.style.transform   = isDelivered ? "scale(0.75)" : "scale(1)";
        el.style.display     = visible ? "" : "none";
        return;
      }

      const el = document.createElement("div");
      el.style.cssText = [
        "width:10px", "height:10px", "border-radius:50%",
        "background:rgba(0,204,255,0.2)", "border:2px solid #00ccff", "cursor:pointer",
        "transition:background 0.3s,border-color 0.3s,box-shadow 0.3s,transform 0.3s",
      ].join(";");
      el.style.display = visible ? "" : "none";

      el.addEventListener("mouseenter", () => {
        const liveOrder   = useSimulationStore.getState().orders[order.id];
        const liveDrivers = useSimulationStore.getState().drivers;
        const typeIcon: Record<string, string> = { food: "🍔", grocery: "🛒", pharmacy: "💊", electronics: "📱" };
        const driverName = liveOrder?.driver_id ? liveDrivers[liveOrder.driver_id]?.name : null;
        showPopup([order.lon, order.lat], `
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e8f4fd;line-height:1.7">
            <div style="font-size:10px;color:#3a6080;letter-spacing:.1em;margin-bottom:4px">
              ${typeIcon[order.order_type] ?? "📦"} ORDER
            </div>
            ${order.restaurant_name ? `<div style="color:#ff9500;margin-bottom:2px">🏪 ${order.restaurant_name}</div>` : ""}
            <div style="color:#7fb3d0">📍 Deliver to: ${order.zone}</div>
            ${driverName ? `<div style="color:#7fff00;margin-top:2px">🛵 ${driverName}</div>` : ""}
            <div style="color:#3a6080;margin-top:2px;font-size:9px">
              Prep: ${order.estimated_prep_minutes} min · ${(liveOrder?.status ?? order.status).replace("_", " ").toUpperCase()}
            </div>
          </div>
        `);
      });
      el.addEventListener("click", () => { if (order.cluster_id) openDrawer("algorithm", "dbscan"); });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([order.lon, order.lat]).addTo(m);
      markersRef.current[order.id] = marker;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIds, deliveredCount, clusterKeys, mapReady, openDrawer, showPopup, visibility.orders]);

  // Cluster circles
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource(SOURCE_CLUSTERS) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "FeatureCollection",
      features: Object.values(clusters)
        .filter((c) => isValidCoord(c.centroid_lat, c.centroid_lon))
        .map((c) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [c.centroid_lon, c.centroid_lat] },
          properties: { id: c.id, color: c.color, label: c.zone_label },
        })),
    });
  }, [clusterKeys, mapReady]); // eslint-disable-line

  // Route lines
  const routeCount = Object.keys(routes).length;
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource(SOURCE_ROUTES) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const features = Object.values(routes)
      .filter((r) => isValidLineString(r.geojson))
      .map((r) => ({
        ...r.geojson!,
        properties: { ...(r.geojson?.properties ?? {}), color: r.color, completed: isCompleted, driverName: r.driver_name },
      }));
    src.setData({ type: "FeatureCollection", features });
  }, [routeCount, isCompleted, mapReady]); // eslint-disable-line

  // Trail lines
  const trailSignature = Object.entries(driverTrails)
    .map(([id, t]) => `${id}:${t.coordinates.length}:${t.isActive}`).join("|");
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource(SOURCE_TRAILS) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    const lineFeatures: GeoJSON.Feature[] = [];
    const dotFeatures:  GeoJSON.Feature[] = [];
    Object.values(driverTrails).forEach((trail) => {
      if (trail.coordinates.length < 2) return;
      const cleanCoords = trail.coordinates.filter(([lon, lat]) => isValidCoord(lat, lon));
      if (cleanCoords.length < 2) return;
      lineFeatures.push({ type: "Feature", geometry: { type: "LineString", coordinates: cleanCoords }, properties: { color: trail.color, isActive: trail.isActive, driverId: trail.driverId } });
      if (trail.isActive && cleanCoords.length > 0) {
        const tip = cleanCoords[cleanCoords.length - 1];
        if (isValidCoord(tip[1], tip[0])) {
          dotFeatures.push({ type: "Feature", geometry: { type: "Point", coordinates: tip }, properties: { color: trail.color, isActive: true, driverId: trail.driverId } });
        }
      }
    });
    src.setData({ type: "FeatureCollection", features: [...lineFeatures, ...dotFeatures] });
  }, [trailSignature, mapReady]); // eslint-disable-line

  // Driver markers
  const positionSignature = Object.entries(driverPositions)
    .map(([id, p]) => `${id}:${p.lat.toFixed(5)},${p.lon.toFixed(5)}:${p.phase}`).join("|");
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    Object.entries(driverPositions).forEach(([id, pos]) => {
      if (!isValidCoord(pos.lat, pos.lon)) return;
      const color = driverTrails[id]?.color ?? "#00ccff";
      const visible = visibility.drivers;
      let marker = driverMarkersRef.current[id];

      if (!marker) {
        const el = document.createElement("div");
        el.className = "driver-marker";
        el.innerHTML = "🛵";
        el.style.borderColor = color;
        el.style.boxShadow   = `0 0 14px ${color}90`;
        el.style.display     = visible ? "" : "none";

        el.addEventListener("mouseenter", () => {
          // Always read live state — never from closure
          const livePos    = useMapStore.getState().driverPositions[id];
          const liveDriver = useSimulationStore.getState().drivers[id];
          const driverName = livePos?.driverName || liveDriver?.name || "Driver";
          // FIX: deliveries_completed is now always a number (0+) thanks to
          // DRIVER_ASSIGNED initialising it and DELIVERY_COMPLETED using safe math.
          const deliveries = typeof liveDriver?.deliveries_completed === 'number'
            ? liveDriver.deliveries_completed
            : 0;
          const isPickup   = livePos?.phase === "pickup";
          const currentLon = livePos?.lon ?? pos.lon;
          const currentLat = livePos?.lat ?? pos.lat;
          showPopup([currentLon, currentLat], `
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e8f4fd;line-height:1.8">
              <div style="font-size:10px;color:#3a6080;letter-spacing:.1em;margin-bottom:4px">🛵 DRIVER</div>
              <div style="color:${color};font-weight:700;font-size:13px;margin-bottom:2px">${driverName}</div>
              <div style="color:#7fb3d0">${deliveries} deliver${deliveries !== 1 ? "ies" : "y"} completed</div>
              ${isPickup && livePos?.restaurantName ? `
                <div style="margin-top:4px;padding:4px 8px;background:rgba(255,149,0,0.1);border:1px solid rgba(255,149,0,0.3);border-radius:4px;color:#ff9500">
                  🏪 Picking up from: ${livePos.restaurantName}
                </div>
              ` : livePos?.currentOrderId ? `
                <div style="margin-top:4px;color:#00ccff">📦 Delivering order</div>
              ` : ""}
              <div style="margin-top:2px;font-size:9px;color:#3a6080">Progress: ${Math.round((livePos?.progress ?? 0) * 100)}%</div>
            </div>
          `);
        });

        marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([pos.lon, pos.lat]).addTo(m);
        driverMarkersRef.current[id] = marker;
      } else {
        marker.setLngLat([pos.lon, pos.lat]);
        const el = marker.getElement();
        el.innerHTML = pos.phase === "pickup" ? "🏃" : "🛵";
        el.style.display = visible ? "" : "none";
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionSignature, mapReady, showPopup, visibility.drivers]);

  useEffect(() => {
    if (status !== "completed") return;
    Object.values(driverMarkersRef.current).forEach((marker) => {
      const el = marker.getElement();
      el.style.transition = "opacity 1.5s ease, transform 1.5s ease";
      el.style.opacity    = "0.55";
      el.style.transform  = "scale(0.85)";
      el.innerHTML        = "🚴‍♂️";
    });
  }, [status]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0,204,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,204,255,0.025) 1px, transparent 1px)`,
        backgroundSize: "60px 60px", zIndex: 1,
      }} />
      {mapReady && <MapToggleControls visibility={visibility} onToggle={handleToggle} />}
      <CornerDecoration position="top-left" />
      <CornerDecoration position="bottom-left" />

      {/* Legend toggle buttons — bottom-left, above the map border */}
      <LegendToggleBar
        showMapLegend={showMapLegend}
        showRouteLegend={showRouteLegend}
        onToggleMapLegend={() => setShowMapLegend((v) => !v)}
        onToggleRouteLegend={() => setShowRouteLegend((v) => !v)}
      />

      {/* Map legend — toggleable, sits just above the toggle buttons */}
      {showMapLegend && <MapLegend openDrawer={openDrawer} />}

      {/* Route network legend — only after completion, toggleable */}
      {isCompleted && Object.keys(routes).length > 0 && showRouteLegend && (
        <CompletionRouteLegend />
      )}
    </div>
  );
}

// ── Map legend ────────────────────────────────────────────────────────────────
function MapLegend({ openDrawer }: { openDrawer: (type: "algorithm" | "concept", id: string) => void }) {
  return (
    <div className="absolute" style={{ bottom: 80, left: 8, zIndex: 10, pointerEvents: "auto" }}>
      <div style={{
        background: "rgba(8,12,24,0.85)", border: "1px solid #1e3a5f",
        borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(12px)",
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#3a6080", letterSpacing: "0.1em", marginBottom: 8 }}>
          LEGEND
        </div>
        <div className="space-y-2">
          <LegendItem color="#00ccff" label="Order (pending)" shape="circle" />
          <LegendItem color="#7fff00" label="Order (delivered)" shape="circle" />
          <LegendItem color="#00ccff" label="Driver" shape="driver" />
          <LegendItem color="rgba(0,204,255,0.3)" label="Cluster zone" shape="area" />
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1e3a5f" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#3a6080", letterSpacing: "0.1em", marginBottom: 6 }}>
            LEARN
          </div>
          {[
            { id: "dbscan", label: "Clustering (DBSCAN)", type: "algorithm" as const },
            { id: "vrp",    label: "VRP Solver",          type: "algorithm" as const },
            { id: "circuity", label: "Road Circuity",     type: "concept"   as const },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => openDrawer(item.type, item.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: 9,
                color: "#7fb3d0", padding: "2px 0", transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#00ccff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#7fb3d0")}
            >
              › {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, shape }: { color: string; label: string; shape: string }) {
  return (
    <div className="flex items-center gap-2">
      {shape === "circle" && (
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, border: "1px solid", borderColor: color, flexShrink: 0 }} />
      )}
      {shape === "driver" && (
        <div style={{ fontSize: 10, lineHeight: 1, flexShrink: 0 }}>🛵</div>
      )}
      {shape === "area" && (
        <div style={{ width: 8, height: 8, borderRadius: 2, background: color, border: `1px solid ${color.replace("0.3", "0.6")}`, flexShrink: 0 }} />
      )}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#7fb3d0" }}>{label}</span>
    </div>
  );
}

// ── Route legend — reads live drivers for delivery count ──────────────────────
function CompletionRouteLegend() {
  // Reactive subscription — re-renders when either routes or drivers change
  const routes  = useSimulationStore((s) => s.routes);
  const drivers = useSimulationStore((s) => s.drivers);

  const driverSummary: Record<string, { name: string; color: string; totalKm: number; deliveries: number; driver_id: string }> = {};

  Object.values(routes).forEach((r) => {
    if (!driverSummary[r.driver_id]) {
      const driver = drivers[r.driver_id];
      // FIX: deliveries_completed is guaranteed to be a number now
      const count = typeof driver?.deliveries_completed === 'number'
        ? driver.deliveries_completed
        : 0;
      driverSummary[r.driver_id] = {
        name: driver?.name || r.driver_name || `Driver ${r.driver_id.slice(-4)}`,
        color: r.color,
        totalKm: 0,
        deliveries: count,
        driver_id: r.driver_id,
      };
    }
    driverSummary[r.driver_id].totalKm += r.total_distance_km;
    // Keep delivery count live — re-read each route pass
    const driver = drivers[r.driver_id];
    if (driver) {
      const live = typeof driver.deliveries_completed === 'number' ? driver.deliveries_completed : 0;
      driverSummary[r.driver_id].deliveries = live;
      if (driver.name) driverSummary[r.driver_id].name = driver.name;
    }
  });

  const summaryList = Object.values(driverSummary)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10);

  if (summaryList.length === 0) return null;

  return (
    <div className="absolute top-16 right-4 pointer-events-none" style={{ zIndex: 10 }}>
      <div style={{
        background: "rgba(8,12,24,0.88)", border: "1px solid rgba(0,204,255,0.2)",
        borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(12px)", minWidth: 185,
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#3a6080", letterSpacing: "0.12em", marginBottom: 8 }}>
          ROUTE NETWORK
        </div>
        {summaryList.map((s) => (
          <div key={s.driver_id} className="flex items-center gap-2 mb-1.5">
            <div style={{ width: 28, height: 2.5, borderRadius: 2, background: s.color, boxShadow: `0 0 6px ${s.color}`, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: s.color, lineHeight: 1.3 }}>{s.name}</div>
              {/* FIX: now shows the real delivery count, not 0 */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#3a6080" }}>
                {s.totalKm.toFixed(1)} km · {s.deliveries} drop{s.deliveries !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #1e3a5f", fontFamily: "var(--font-mono)", fontSize: 8, color: "#3a6080" }}>
          {summaryList.length} driver{summaryList.length !== 1 ? "s" : ""} · optimised
        </div>
      </div>
    </div>
  );
}

function CornerDecoration({ position }: { position: string }) {
  const posClass = ({ "top-left": "top-4 left-4", "bottom-left": "bottom-4 left-4" } as Record<string, string>)[position] ?? "top-4 left-4";
  return (
    <div className={`absolute ${posClass} pointer-events-none`} style={{ zIndex: 2 }}>
      <div style={{ width: 20, height: 20, borderTop: "2px solid rgba(0,204,255,0.4)", borderLeft: "2px solid rgba(0,204,255,0.4)" }} />
    </div>
  );
}