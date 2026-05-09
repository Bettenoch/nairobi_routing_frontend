//src/components/sidebar/SimulateButton.tsx

import { useState } from "react";
import { Play, RotateCcw, Zap } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useSimulation } from "@/hooks/useSimulation";

export default function SimulateButton() {
  const status = useSimulationStore((s) => s.status);
  const { startSimulation } = useSimulation();
  const [loading, setLoading] = useState(false);

  const isRunning =
    status !== null && !["completed", "failed"].includes(status);
  const isCompleted = status === "completed" || status === "failed";

  const handleClick = async () => {
    if (isRunning || loading) return;
    setLoading(true);
    // Immediately show "starting" state — don't wait for API
    useSimulationStore
      .getState()
      .setStatus("initialising" as never, "Starting simulation…");
    try {
      await startSimulation();
    } catch (err) {
      useSimulationStore
        .getState()
        .setStatus("failed" as never, "Failed to start");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isRunning || loading}
        style={{
          width: "100%",
          padding: "12px 20px",
          borderRadius: 10,
          border: "none",

          opacity: isRunning || loading ? 0.7 : 1,
          cursor: isRunning || loading ? "not-allowed" : "pointer",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "#050810",
          background: isRunning
            ? "linear-gradient(135deg, #007799, #005566)"
            : "linear-gradient(135deg, #00ccff 0%, #0099cc 100%)",
          boxShadow: isRunning ? "none" : "0 0 30px rgba(0,204,255,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all 0.25s ease",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          if (!isRunning) e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {isRunning ? (
          <>
            <Spinner />
            SIMULATING…
          </>
        ) : isCompleted ? (
          <>
            <RotateCcw size={14} />
            RUN AGAIN
          </>
        ) : (
          <>
            <Play size={14} fill="currentColor" />
            SIMULATE
          </>
        )}

        {/* Shimmer effect */}
        {!isRunning && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "-100%",
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              animation: "shimmer 3s infinite",
            }}
          />
        )}
      </button>

      {/* Quick stats below button */}
      <div className="flex justify-between">
        <QuickStat
          label="METHOD"
          value={useSimulationStore
            .getState()
            .config.routing_method.replace("_", " ")
            .toUpperCase()}
        />
        <QuickStat
          label="ORDERS"
          value={String(useSimulationStore.getState().config.order_count)}
        />
        <QuickStat
          label="DRIVERS"
          value={String(useSimulationStore.getState().config.driver_count)}
        />
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  const routingMethod = useSimulationStore((s) => s.config.routing_method);
  const orderCount = useSimulationStore((s) => s.config.order_count);
  const driverCount = useSimulationStore((s) => s.config.driver_count);

  const displayValue =
    label === "METHOD"
      ? routingMethod.replace("_", " ").toUpperCase()
      : label === "ORDERS"
        ? String(orderCount)
        : String(driverCount);

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          color: "#3a6080",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: 10,
          color: "#7fb3d0",
        }}
      >
        {displayValue}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 12,
        height: 12,
        border: "2px solid rgba(5,8,16,0.3)",
        borderTopColor: "#050810",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

// Add spin keyframe via style tag
const spinStyle = document.createElement("style");
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);
