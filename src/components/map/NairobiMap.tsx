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

// ── Coordinate guard ──────────────────────────────────────────────────────────
// Prevents the [0,0] snap-to-origin flicker.
// A coordinate is valid if it's a finite number and not at the null island.
function isValidCoord(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    !(lat === 0 && lon === 0) &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
  );
}

// Validate GeoJSON LineString — reject any feature whose first coordinate
// is [0,0] or contains non-finite numbers (backend occasionally emits these
// during the OSRM fallback path before the real geometry arrives).
function isValidLineString(geojson: unknown): boolean {
  if (!geojson || typeof geojson !== "object") return false;
  const g = geojson as Record<string, unknown>;
  const geometry = g.geometry as Record<string, unknown> | undefined;
  if (!geometry) return false;
  const coords = geometry.coordinates as [number, number][] | undefined;
  if (!Array.isArray(coords) || coords.length < 2) return false;
  // Check the first and last coord — reject obvious [0,0] placeholders
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

export default function NairobiMap() {
  const mapContainer     = useRef<HTMLDivElement>(null);
  const map              = useRef<mapboxgl.Map | null>(null);
  const markersRef       = useRef<Record<string, mapboxgl.Marker>>({});
  const driverMarkersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const popupRef         = useRef<mapboxgl.Popup | null>(null);

  // mapReady gates ALL data effects — prevents [0,0] coordinate flicker
  // on initial render before the map style is loaded.
  const [mapReady, setMapReady] = useState(false);

  const { orders, clusters, routes, status, drivers } = useSimulationStore();
  const { driverPositions, deliveredOrderIds, driverTrails } = useMapStore();
  const { openDrawer } = useUIStore();

  const isCompleted = status === "completed";

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
  // Runs ONCE. The `map.current` guard prevents double-init from StrictMode.
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

      // ── Sources ───────────────────────────────────────────────────────────
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

      // ── Layers ────────────────────────────────────────────────────────────

      // 1. Cluster zone halos
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

      // 2. Route glow
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

      // 3. Route base line
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

      // 4. Trail glow
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

      // 5. Trail solid line
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

      // 6. Trail leading dot
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

      // Close popup on map click
      m.on("click", () => popupRef.current?.remove());

      // Signal that the map and all sources/layers are ready.
      // Using 'idle' ensures the first render is complete before we
      // start adding markers — prevents the "marker teleports to [0,0]" bug.
      m.once("idle", () => setMapReady(true));
    });

    return () => {
      popupRef.current?.remove();
      // Don't call m.remove() on cleanup in StrictMode — it would kill the map
      // before the second mount. Instead we guard with `if (map.current)` above.
      // Only remove on true unmount (component leaves the tree).
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ Empty deps: this effect must ONLY run once. Adding deps would re-init the map.

  // ── Order markers (with hover popup) ─────────────────────────────────────
  // BUG FIX: added `isValidCoord` guard to skip any order with bad coordinates.
  // Bad coords arrive during the ORDER_CREATED burst before OSRM snapping finishes.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    Object.values(orders).forEach((order) => {
      // ← GUARD: skip bad coordinates entirely
      if (!isValidCoord(order.lat, order.lon)) return;

      const isDelivered  = deliveredOrderIds.has(order.id);
      const clusterColor = order.cluster_id ? clusters[order.cluster_id]?.color : null;
      const activeColor  = clusterColor ?? "#00ccff";

      if (markersRef.current[order.id]) {
        // Update existing marker style in-place (no remove/re-add = no flicker)
        const el = markersRef.current[order.id].getElement();
        el.style.background  = isDelivered ? "#7fff00" : `${activeColor}44`;
        el.style.borderColor = isDelivered ? "#7fff00" : activeColor;
        el.style.boxShadow   = isDelivered ? "0 0 12px #7fff00" : "none";
        el.style.transform   = isDelivered ? "scale(0.75)" : "scale(1)";
        return;
      }

      const el = document.createElement("div");
      el.style.cssText = [
        "width:10px", "height:10px", "border-radius:50%",
        "background:rgba(0,204,255,0.2)", "border:2px solid #00ccff",
        "cursor:pointer",
        "transition:background 0.3s,border-color 0.3s,box-shadow 0.3s,transform 0.3s",
      ].join(";");

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
  }, [orders, clusters, deliveredOrderIds, mapReady, openDrawer, drivers, showPopup]);

  // ── Cluster circles ───────────────────────────────────────────────────────
  // BUG FIX: added isValidCoord guard — a cluster with bad centroid would
  // render a halo at [0,0], causing a visible flash at the ocean.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource(SOURCE_CLUSTERS) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    src.setData({
      type: "FeatureCollection",
      features: Object.values(clusters)
        .filter((c) => isValidCoord(c.centroid_lat, c.centroid_lon)) // ← GUARD
        .map((c) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [c.centroid_lon, c.centroid_lat] },
          properties: { id: c.id, color: c.color, label: c.zone_label },
        })),
    });
  }, [clusters, mapReady]);

  // ── Route lines ───────────────────────────────────────────────────────────
  // BUG FIX: added isValidLineString guard so routes with empty/zeroed
  // geojson coordinates (OSRM fallback placeholder) are not rendered.
  // The street_network geojson from OSRM follows actual Nairobi roads.
  // Euclidean/haversine geojson are straight lines — both correct by design.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource(SOURCE_ROUTES) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    const features = Object.values(routes)
      .filter((r) => isValidLineString(r.geojson)) // ← GUARD replaces old length check
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
  }, [routes, isCompleted, mapReady]);

  // ── Trail lines ───────────────────────────────────────────────────────────
  // BUG FIX: added coordinate guard on the leading dot — if the last trail
  // point is [0,0] (brief intermediate state) we skip the dot.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;
    const src = m.getSource(SOURCE_TRAILS) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    const lineFeatures: GeoJSON.Feature[] = [];
    const dotFeatures:  GeoJSON.Feature[] = [];

    Object.values(driverTrails).forEach((trail) => {
      if (trail.coordinates.length < 2) return;

      // Filter out any [0,0] stray points from the trail history
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
        // ← GUARD: only render the leading dot if the tip is valid
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
  }, [driverTrails, mapReady]);

  // ── Driver markers (with hover popup) ────────────────────────────────────
  // BUG FIX: added isValidCoord guard; also skip setLngLat if coord unchanged
  // to avoid unnecessary DOM thrashing that causes visual jitter.
  useEffect(() => {
    const m = map.current;
    if (!m || !mapReady) return;

    Object.entries(driverPositions).forEach(([id, pos]) => {
      // ← GUARD: skip bad coordinates
      if (!isValidCoord(pos.lat, pos.lon)) return;

      const color = driverTrails[id]?.color ?? "#00ccff";
      const driver = drivers[id];

      let marker = driverMarkersRef.current[id];
      if (!marker) {
        const el = document.createElement("div");
        el.className = "driver-marker";
        el.innerHTML = "🛵";
        el.style.borderColor = color;
        el.style.boxShadow   = `0 0 14px ${color}90`;

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
        // Only update position — avoids full DOM recreation that causes flicker
        marker.setLngLat([pos.lon, pos.lat]);
      }
    });
  }, [driverPositions, driverTrails, drivers, mapReady, showPopup]);

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

      <CornerDecoration position="top-left" />
      <CornerDecoration position="top-right" />
      <CornerDecoration position="bottom-left" />

      {isCompleted && Object.keys(routes).length > 0 && (
        <CompletionRouteLegend />
      )}
    </div>
  );
}

// ── Completion legend — BUG FIX: shows real delivery counts ──────────────────
// ROOT CAUSE: `driver.deliveries_completed` was being read at legend render
// time from the store snapshot, but routes have multiple entries per driver
// (one per cluster). We now build a proper aggregation map from all routes
// and read driver data fresh from the store at render time.
function CompletionRouteLegend() {
  const routes  = useSimulationStore((s) => s.routes);
  const drivers = useSimulationStore((s) => s.drivers);

  // Build a map of driver_id → { name, color, totalKm, deliveries }
  // This aggregates across all routes for the same driver.
  const driverSummary: Record<string, {
    name: string;
    color: string;
    totalKm: number;
    deliveries: number;
    driver_id: string;
  }> = {};

  Object.values(routes).forEach((r) => {
    const driver = drivers[r.driver_id];
    if (!driverSummary[r.driver_id]) {
      driverSummary[r.driver_id] = {
        name:       driver?.name ?? r.driver_name ?? "Driver",
        color:      r.color,
        totalKm:    0,
        // ← FIX: read deliveries_completed directly from the drivers store,
        //   not from the route object (which has no delivery count).
        //   The store is updated by DELIVERY_COMPLETED events in useSimulation.
        deliveries: driver?.deliveries_completed ?? 0,
        driver_id:  r.driver_id,
      };
    }
    driverSummary[r.driver_id].totalKm += r.total_distance_km;
    // Refresh deliveries in case the driver entry arrived after the first route
    if (driver) {
      driverSummary[r.driver_id].deliveries = driver.deliveries_completed;
    }
  });

  const summaryList = Object.values(driverSummary).slice(0, 10);

  return (
    <div
      className="absolute top-4 right-4 pointer-events-none"
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
          {summaryList.length} drivers · optimised
        </div>
      </div>
    </div>
  );
}

function CornerDecoration({ position }: { position: string }) {
  const posClass = ({
    "top-left":    "top-4 left-4",
    "top-right":   "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
  } as Record<string, string>)[position] ?? "top-4 left-4";

  return (
    <div className={`absolute ${posClass} pointer-events-none`} style={{ zIndex: 2 }}>
      <div style={{
        width: 20, height: 20,
        borderTop:   "2px solid rgba(0,204,255,0.4)",
        borderLeft:  position.includes("right") ? "none" : "2px solid rgba(0,204,255,0.4)",
        borderRight: position.includes("right") ? "2px solid rgba(0,204,255,0.4)" : "none",
      }} />
    </div>
  );
}