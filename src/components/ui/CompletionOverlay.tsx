//src/components/ui/CompletionOverlay.tsx

import { X, TrendingDown, Zap, Clock, Leaf } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useUIStore } from "@/store/uiStore";

export default function CompletionOverlay() {
  const { completionSummary, metrics, config } = useSimulationStore();
  const { showCompletion, setShowCompletion } = useUIStore();

  if (!showCompletion || !completionSummary) return null;

  const stats = [
    {
      icon: <TrendingDown size={18} />,
      label: "Distance Saved",
      value: `${metrics.distance_saved_km.toFixed(1)} km`,
      sub: `vs ${metrics.naive_distance_km.toFixed(1)} km naive`,
      color: "#00ccff",
    },
    {
      icon: <Zap size={18} />,
      label: "Fuel Saved",
      value: `${metrics.fuel_saved_litres.toFixed(1)} L`,
      sub: `KES ${Math.round(metrics.cost_saved_kes).toLocaleString()}`,
      color: "#7fff00",
    },
    {
      icon: <Clock size={18} />,
      label: "Time Saved",
      value: `${Math.round(metrics.time_saved_minutes)} min`,
      sub: "across all drivers",
      color: "#ffaa00",
    },
    {
      icon: <Leaf size={18} />,
      label: "CO₂ Avoided",
      value: `${metrics.co2_saved_kg.toFixed(2)} kg`,
      sub: "carbon emissions",
      color: "#96CEB4",
    },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: "rgba(5,8,16,0.8)",
        backdropFilter: "blur(8px)",
        zIndex: 60,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowCompletion(false);
      }}
    >
      <div
        className="animate-fade-in-up"
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "rgba(8,12,24,0.98)",
          border: "1px solid #1e3a5f",
          borderRadius: 16,
          padding: 32,
          position: "relative",
          boxShadow:
            "0 0 80px rgba(0,204,255,0.15), 0 40px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Top cyan accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 32,
            right: 32,
            height: 2,
            background:
              "linear-gradient(90deg, transparent, #00ccff, #7fff00, transparent)",
            borderRadius: "0 0 4px 4px",
          }}
        />

        {/* Close */}
        <button
          onClick={() => setShowCompletion(false)}
          style={{
            position: "sticky",
            top: 0,
            float: "right",
            background: "rgba(8,12,24,0.9)",
            border: "1px solid #1e3a5f",
            borderRadius: 6,
            cursor: "pointer",
            color: "#7fb3d0",
            padding: "4px 8px",
            zIndex: 10,
            marginBottom: -28, // pulls it up so it doesn't add height
          }}
        >
          <X size={16} />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 26,
              color: "#e8f4fd",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            Simulation Complete
          </h2>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#3a6080",
              marginTop: 4,
            }}
          >
            {config.scenario_label} · {completionSummary.total_deliveries}{" "}
            deliveries · {completionSummary.duration_seconds.toFixed(1)}s
          </p>
        </div>

        {/* Hero savings */}
        <div
          className="text-center mb-6"
          style={{
            background: "rgba(127,255,0,0.06)",
            border: "1px solid rgba(127,255,0,0.2)",
            borderRadius: 12,
            padding: "16px 24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "#4a9900",
              letterSpacing: "0.12em",
              marginBottom: 4,
            }}
          >
            ROUTING OPTIMISATION SAVINGS
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 56,
              color: "#7fff00",
              textShadow: "0 0 40px rgba(127,255,0,0.5)",
              lineHeight: 1,
            }}
          >
            {completionSummary.total_savings_pct.toFixed(1)}%
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#4a9900",
              marginTop: 4,
            }}
          >
            compared to naive (zero-batching) routing
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(17,24,39,0.8)",
                border: `1px solid ${s.color}30`,
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <div
                className="flex items-center gap-2 mb-1"
                style={{ color: s.color }}
              >
                {s.icon}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                  }}
                >
                  {s.label.toUpperCase()}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: s.color,
                  textShadow: `0 0 20px ${s.color}50`,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "#3a6080",
                }}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Routing method used */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#3a6080",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Routing:{" "}
          <span style={{ color: "#7fb3d0" }}>
            {config.routing_method.replace("_", " ").toUpperCase()}
          </span>
          {" · "}
          Clustering: <span style={{ color: "#7fb3d0" }}>DBSCAN ε=1.5km</span>
          {" · "}
          Drivers:{" "}
          <span style={{ color: "#7fb3d0" }}>{config.driver_count}</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => setShowCompletion(false)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #00ccff, #0099cc)",
            color: "#050810",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(0,204,255,0.25)",
          }}
        >
          Explore the Map
        </button>
      </div>
    </div>
  );
}
