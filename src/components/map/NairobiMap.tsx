//src/components/map/NairobiMap.tsx
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

// ── Layer / Source IDs ────────────────────────────────────────────────────────
const LAYER_CLUSTER_CIRCLES = "cluster-circles";
const LAYER_ROUTE_GLOW      = "route-lines-glow";
const LAYER_ROUTE_BASE      = "route-lines";
const LAYER_TRAIL_GLOW      = "trail-glow";
const LAYER_TRAIL_BASE      = "trail-base";
const LAYER_TRAIL_DOTS      = "trail-dots";

const SOURCE_CLUSTERS = "clusters";
const SOURCE_ROUTES   = "routes";
const SOURCE_TRAILS   = "trails";

// ── Toggle feature IDs ────────────────────────────────────────────────────────
type ToggleFeature = "orders" | "drivers" | "clusters" | "routes" | "trails";

// ── Coordinate guard ──────────────────────────────────────────────────────────
function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    !(lat === 0 && lon === 0) &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
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
    if (
      !Array.isArray(c) ||
      !Number.isFinite(c[0]) ||
      !Number.isFinite(c[1]) ||
      (c[0] === 0 && c[1] === 0)
    ) return false;
  }
  return true;
}

function stableKeys(obj: Record<string, unknown>): string {
  return Object.keys(obj).sort().join(",");
}

// ── Map toggle button component ───────────────────────────────────────────────
function ToggleButton({
  label,
  icon,
  active,
  onClick,
  color,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      title={`Toggle ${label}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 6,
        border: `1px solid ${active ? color + "60" : "#1e3a5f"}`,
        background: active ? `${color}18` : "rgba(8,12,24,0.6)",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        color: active ? color : "#3a6080",
        letterSpacing: "0.08em",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.borderColor = color + "40";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.borderColor = "#1e3a5f";
      }}
    >
      <span style={{ fontSize: 11 }}>{icon}</span>
      {label.toUpperCase()}
      {/* Active dot */}
      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: active ? color : "#1e3a5f",
          boxShadow: active ? `0 0 6px ${color}` : "none",
          marginLeft: 2,
          flexShrink: 0,
        }}
      />
    </button>
  );
}

// ── Map feature toggle controls ───────────────────────────────────────────────
function MapToggleControls({
  visibility,
  onToggle,
}: {
  visibility: Record<ToggleFeature, boolean>;
  onToggle: (f: ToggleFeature) => void;
}) {
  const TOGGLES: { id: ToggleFeature; label: string; icon: string; color: string }[] = [
    { id: "orders",   label: "Orders",   icon: "📦", color: "#00ccff" },
    { id: "drivers",  label: "Drivers",  icon: "🛵", color: "#7fff00" },
    { id: "clusters", label: "Clusters", icon: "⬡",  color: "#ffaa00" },
    { id: "routes",   label: "Routes",   icon: "〰",  color: "#4ECDC4" },
    { id: "trails",   label: "Trails",   icon: "✦",  color: "#DDA0DD" },
  ];

  return (
    <div
      className="absolute"
      style={{
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        display: "flex",
        gap: 6,
        background: "rgba(8,12,24,0.88)",
        border: "1px solid rgba(0,204,255,0.15)",
        borderRadius: 10,
        padding: "6px 8px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      {TOGGLES.map((t) => (
        <ToggleButton
          key={t.id}
          label={t.label}
          icon={t.icon}
          active={visibility[t.id]}
          onClick={() => onToggle(t.id)}
          color={t.color}
        />
      ))}
    </div>
  );
}

export default function NairobiMap() {
  const mapContainer     = useRef<HTMLDivElement>(null);
  const map              = useRef<mapboxgl.Map | null>(null);
  const markersRef       = useRef<Record<string, mapboxgl.Marker>>({});
  const driverMarkersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const popupRef         = useRef<mapboxgl.Popup | null>(null);

  const [mapReady, setMapReady] = useState(false);

  // Feature visibility toggles
  const [visibility, setVisibility] = useState<Record<ToggleFeature, boolean>>({
    orders:   true,
    drivers:  true,
    clusters: true,
    routes:   true,
    trails:   true,
  });

  const { orders, clusters, routes, status, drivers } = useSimulationStore();
  const { driverPositions, deliveredOrderIds, driverTrails } = useMapStore();
  const { openDrawer } = useUIStore();

  const isCompleted = status === "completed";

  // ── Toggle handler ────────────────────────────────────────────────────────
  const handleToggle = useCallback((feature: ToggleFeature) => {
    setVisibility((prev) => ({ ...prev, [feature]: !prev[feature] }));
  }, []);

  // ── Apply layer visibility to Mapbox layers ───────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    const layerVisibility = (v: boolean) => (v ? "visible" : "none") as "visible" | "none";

    // Clusters
    if (m.getLayer(LAYER_CLUSTER_CIRCLES)) {
      m.setLayoutProperty(LAYER_CLUSTER_CIRCLES, "visibility", layerVisibility(visibility.clusters));
    }
    // Routes
    if (m.getLayer(LAYER_ROUTE_GLOW)) {
      m.setLayoutProperty(LAYER_ROUTE_GLOW, "visibility", layerVisibility(visibility.routes));
    }
    if (m.getLayer(LAYER_ROUTE_BASE)) {
      m.setLayoutProperty(LAYER_ROUTE_BASE, "visibility", layerVisibility(visibility.routes));
    }
    // Trails
    if (m.getLayer(LAYER_TRAIL_GLOW)) {
      m.setLayoutProperty(LAYER_TRAIL_GLOW, "visibility", layerVisibility(visibility.trails));
    }
    if (m.getLayer(LAYER_TRAIL_BASE)) {
      m.setLayoutProperty(LAYER_TRAIL_BASE, "visibility", layerVisibility(visibility.trails));
    }
    if (m.getLayer(LAYER_TRAIL_DOTS)) {
      m.setLayoutProperty(LAYER_TRAIL_DOTS, "visibility", layerVisibility(visibility.trails));
    }
  }, [visibility, mapReady]);

  // ── Apply marker visibility ───────────────────────────────────────────────
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

  // ── Shared popup helper ───────────────────────────────────────────────────
  const showPopup = useCallback((lngLat: mapboxgl.LngLatLike, html: string) => {
    popupRef.current?.remove();
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: true,
      maxWidth: "260px",
      offset: 14,
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map.current!);
  }, []);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAPBOX_STYLE,
      center: [INITIAL_VIEWPORT.longitude, INITIAL_VIEWPORT.latitude],
      zoom: INITIAL_VIEWPORT.zoom,
      pitch: INITIAL_VIEWPORT.pitch,
      bearing: INITIAL_VIEWPORT.bearing,
      antialias: true,
      fadeDuration: 0,
    });

    map.current = m;

    m.on("load", () => {
      m.setFog({
        color: "#050810",
        "high-color": "#0d1424",
        "horizon-blend": 0.05,
        "space-color": "#000000",
        "star-intensity": 0.6,
      });

      m.addSource(SOURCE_CLUSTERS, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addSource(SOURCE_ROUTES, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addSource(SOURCE_TRAILS, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      m.addLayer({
        id: LAYER_CLUSTER_CIRCLES,
        type: "circle",
        source: SOURCE_CLUSTERS,
        paint: {
          "circle-radius": 60,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.06,
          "circle-stroke-width": 1,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": 0.25,
        },
      });

      m.addLayer({
        id: LAYER_ROUTE_GLOW,
        type: "line",
        source: SOURCE_ROUTES,
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["boolean", ["get", "completed"], false], 10, 8],
          "line-opacity": ["case", ["boolean", ["get", "completed"], false], 0.3, 0.1],
          "line-blur": 8,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      m.addLayer({
        id: LAYER_ROUTE_BASE,
        type: "line",
        source: SOURCE_ROUTES,
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["boolean", ["get", "completed"], false], 2.5, 1.5],
          "line-opacity": ["case", ["boolean", ["get", "completed"], false], 0.9, 0.28],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      m.addLayer({
        id: LAYER_TRAIL_GLOW,
        type: "line",
        source: SOURCE_TRAILS,
        filter: ["all",
          ["==", ["geometry-type"], "LineString"],
          ["==", ["get", "isActive"], true],
        ],
        paint: {
          "line-color": ["get", "color"],
          "line-width": 18,
          "line-opacity": 0.18,
          "line-blur": 12,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      m.addLayer({
        id: LAYER_TRAIL_BASE,
        type: "line",
        source: SOURCE_TRAILS,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["boolean", ["get", "isActive"], false], 3.5, 2],
          "line-opacity": ["case", ["boolean", ["get", "isActive"], false], 1.0, 0.6],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      m.addLayer({
        id: LAYER_TRAIL_DOTS,
        type: "circle",
        source: SOURCE_TRAILS,
        filter: ["all",
          ["==", ["geometry-type"], "Point"],
          ["==", ["get", "isActive"], true],
        ],
        paint: {
          "circle-radius": 7,
          "circle-color": ["get", "color"],
          "circle-opacity": 1.0,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.85,
        },
      });

      m.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );

      m.on("click", () => popupRef.current?.remove());

      m.once("idle", () => setMapReady(true));
    });

    return () => {
      popupRef.current?.remove();
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Order markers ─────────────────────────────────────────────────────────
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
        "background:rgba(0,204,255,0.2)", "border:2px solid #00ccff",
        "cursor:pointer",
        "transition:background 0.3s,border-color 0.3s,box-shadow 0.3s,transform 0.3s",
      ].join(";");
      el.style.display = visible ? "" : "none";

      el.addEventListener("mouseenter", () => {
        const typeIcon: Record<string, string> = {
          food: "🍔", grocery: "🛒", pharmacy: "💊", electronics: "📱",
        };
        const driverName = order.driver_id ? drivers[order.driver_id]?.name : null;
        const restaurantName = order.restaurant_name || order.zone;
        const popup = `
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e8f4fd;line-height:1.7">
            <div style="font-size:10px;color:#3a6080;letter-spacing:.1em;margin-bottom:4px">
              ${typeIcon[order.order_type] ?? "📦"} ORDER
            </div>
            <div style="color:#00ccff;font-weight:600;margin-bottom:2px">
              ${restaurantName}
            </div>
            <div style="color:#7fb3d0">📍 ${order.zone}</div>
            ${driverName ? `<div style="color:#7fff00;margin-top:2px">🛵 ${driverName}</div>` : ""}
            <div style="color:#3a6080;margin-top:2px;font-size:9px">
              Prep: ${order.estimated_prep_minutes} min · ${order.status.replace("_", " ").toUpperCase()}
            </div>
          </div>
        `;
        showPopup([order.lon, order.lat], popup);
      });

      el.addEventListener("click", () => {
        if (order.cluster_id) openDrawer("algorithm", "dbscan");
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([order.lon, order.lat])
        .addTo(m);

      markersRef.current[order.id] = marker;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIds, deliveredCount, clusterKeys, mapReady, openDrawer, showPopup, visibility.orders]);

  // ── Cluster circles ───────────────────────────────────────────────────────
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
  }, [clusterKeys, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route lines ───────────────────────────────────────────────────────────
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
        properties: {
          ...(r.geojson?.properties ?? {}),
          color: r.color,
          completed: isCompleted,
          driverName: r.driver_name,
        },
      }));

    src.setData({ type: "FeatureCollection", features });
  }, [routeCount, isCompleted, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trail lines ───────────────────────────────────────────────────────────
  const trailSignature = Object.entries(driverTrails)
    .map(([id, t]) => `${id}:${t.coordinates.length}:${t.isActive}`)
    .join("|");

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource(SOURCE_TRAILS) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    const lineFeatures: GeoJSON.Feature[] = [];
    const dotFeatures:  GeoJSON.Feature[] = [];

    Object.values(driverTrails).forEach((trail) => {
      if (trail.coordinates.length < 2) return;

      const cleanCoords = trail.coordinates.filter(
        ([lon, lat]) => isValidCoord(lat, lon)
      );
      if (cleanCoords.length < 2) return;

      lineFeatures.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: cleanCoords },
        properties: {
          color:    trail.color,
          isActive: trail.isActive,
          driverId: trail.driverId,
        },
      });

      if (trail.isActive && cleanCoords.length > 0) {
        const tip = cleanCoords[cleanCoords.length - 1];
        if (isValidCoord(tip[1], tip[0])) {
          dotFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: tip },
            properties: { color: trail.color, isActive: true, driverId: trail.driverId },
          });
        }
      }
    });

    src.setData({
      type: "FeatureCollection",
      features: [...lineFeatures, ...dotFeatures],
    });
  }, [trailSignature, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Driver markers ────────────────────────────────────────────────────────
  const positionSignature = Object.entries(driverPositions)
    .map(([id, p]) => `${id}:${p.lat.toFixed(5)},${p.lon.toFixed(5)}`)
    .join("|");

  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    Object.entries(driverPositions).forEach(([id, pos]) => {
      if (!isValidCoord(pos.lat, pos.lon)) return;

      const color = driverTrails[id]?.color ?? "#00ccff";
      const driver = drivers[id];
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
          const driverName = pos.driverName || driver?.name || "Driver";
          const zone = driver?.zone ?? "";
          const deliveries = driver?.deliveries_completed ?? 0;
          const pickupOrder = pos.currentOrderId
            ? useSimulationStore.getState().orders[pos.currentOrderId]
            : null;
          const restaurant = pickupOrder?.restaurant_name ?? pickupOrder?.zone ?? "";
          const popup = `
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e8f4fd;line-height:1.8">
              <div style="font-size:10px;color:#3a6080;letter-spacing:.1em;margin-bottom:4px">
                🛵 DRIVER
              </div>
              <div style="color:${color};font-weight:700;font-size:13px;margin-bottom:2px">
                ${driverName}
              </div>
              <div style="color:#7fb3d0">📍 ${zone}</div>
              <div style="color:#7fb3d0">${deliveries} deliveries completed</div>
              ${restaurant ? `
                <div style="margin-top:4px;padding-top:4px;border-top:1px solid #1e3a5f;color:#ffaa00">
                  🏪 Pickup: ${restaurant}
                </div>
              ` : ""}
              <div style="margin-top:2px;font-size:9px;color:#3a6080">
                Progress: ${Math.round((pos.progress ?? 0) * 100)}%
              </div>
            </div>
          `;
          showPopup([pos.lon, pos.lat], popup);
        });

        marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([pos.lon, pos.lat])
          .addTo(m);
        driverMarkersRef.current[id] = marker;
      } else {
        marker.setLngLat([pos.lon, pos.lat]);
        marker.getElement().style.display = visible ? "" : "none";
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionSignature, mapReady, showPopup, visibility.drivers]);

  // ── On completion: dim & park drivers ────────────────────────────────────
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

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,204,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,204,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          zIndex: 1,
        }}
      />

      {/* Toggle controls — centered top bar */}
      {mapReady && (
        <MapToggleControls visibility={visibility} onToggle={handleToggle} />
      )}

      <CornerDecoration position="top-left" />
      <CornerDecoration position="bottom-left" />

      {isCompleted && Object.keys(routes).length > 0 && (
        <CompletionRouteLegend />
      )}
    </div>
  );
}

// ── Completion legend — FIXED deduplication ───────────────────────────────────
// Root cause of "#2" names: routes store `driver_name` from ROUTE_COMPUTED events
// which may be stale/empty on first emit. We now use `drivers` store as the
// ONLY source of truth for names, and aggregate by driver_id to get one entry
// per physical driver (not per route/cluster).
function CompletionRouteLegend() {
  const routes  = useSimulationStore((s) => s.routes);
  const drivers = useSimulationStore((s) => s.drivers);

  // Aggregate all routes by driver_id → single summary per driver
  // Key fix: use drivers[driver_id].name as the canonical name, not route.driver_name
  const driverSummary: Record<string, {
    name: string;
    color: string;
    totalKm: number;
    deliveries: number;
    driver_id: string;
  }> = {};

  Object.values(routes).forEach((r) => {
    if (!driverSummary[r.driver_id]) {
      // Canonical name comes from the drivers store — always
      const driver = drivers[r.driver_id];
      // NEVER fall back to r.driver_name — it causes "#2" duplication
      const name = driver?.name || `Driver ${r.driver_id.slice(-4)}`;

      driverSummary[r.driver_id] = {
        name,
        color:      r.color,
        totalKm:    0,
        deliveries: driver?.deliveries_completed ?? 0,
        driver_id:  r.driver_id,
      };
    }

    // Accumulate distance across all this driver's routes (clusters)
    driverSummary[r.driver_id].totalKm += r.total_distance_km;

    // Refresh deliveries and name from the live drivers store
    const driver = drivers[r.driver_id];
    if (driver) {
      driverSummary[r.driver_id].deliveries = driver.deliveries_completed;
      driverSummary[r.driver_id].name = driver.name || driverSummary[r.driver_id].name;
    }
  });

  // Sort by driver name for stable ordering
  const summaryList = Object.values(driverSummary)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10);

  if (summaryList.length === 0) return null;

  return (
    <div
      className="absolute top-16 right-4 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <div
        style={{
          background:     "rgba(8,12,24,0.88)",
          border:         "1px solid rgba(0,204,255,0.2)",
          borderRadius:   10,
          padding:        "10px 14px",
          backdropFilter: "blur(12px)",
          minWidth:       185,
        }}
      >
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 8,
          color: "#3a6080", letterSpacing: "0.12em", marginBottom: 8,
        }}>
          ROUTE NETWORK
        </div>

        {summaryList.map((s) => (
          <div key={s.driver_id} className="flex items-center gap-2 mb-1.5">
            <div style={{
              width: 28, height: 2.5, borderRadius: 2,
              background: s.color,
              boxShadow: `0 0 6px ${s.color}`,
              flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 9,
                color: s.color, lineHeight: 1.3,
              }}>
                {s.name}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 8, color: "#3a6080",
              }}>
                {s.totalKm.toFixed(1)} km · {s.deliveries} drops
              </div>
            </div>
          </div>
        ))}

        <div style={{
          marginTop: 8, paddingTop: 6,
          borderTop: "1px solid #1e3a5f",
          fontFamily: "var(--font-mono)", fontSize: 8, color: "#3a6080",
        }}>
          {summaryList.length} driver{summaryList.length !== 1 ? "s" : ""} · optimised
        </div>
      </div>
    </div>
  );
}

function CornerDecoration({ position }: { position: string }) {
  const posClass = ({
    "top-left":    "top-4 left-4",
    "bottom-left": "bottom-4 left-4",
  } as Record<string, string>)[position] ?? "top-4 left-4";

  return (
    <div className={`absolute ${posClass} pointer-events-none`} style={{ zIndex: 2 }}>
      <div style={{
        width: 20, height: 20,
        borderTop:  "2px solid rgba(0,204,255,0.4)",
        borderLeft: "2px solid rgba(0,204,255,0.4)",
      }} />
    </div>
  );
}