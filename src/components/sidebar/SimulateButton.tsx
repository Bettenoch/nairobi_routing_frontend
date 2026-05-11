// src/components/sidebar/SimulateButton.tsx

import { useState } from "react";
import { Play, RotateCcw, Zap } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useSimulation } from "@/hooks/useSimulation";

export default function SimulateButton() {
  const status = useSimulationStore((s) => s.status);
  const { startSimulation } = useSimulation();
  
  const [isPending, setIsPending] = useState(false); // Immediate local feedback

  const isRunning = 
    status !== null && 
    !["completed", "failed"].includes(status);

  const isCompleted = status === "completed" || status === "failed";

  const handleClick = async () => {
    if (isRunning || isPending) return;

    setIsPending(true);
    
    // Immediately show loading state to user
    useSimulationStore
      .getState()
      .setStatus("initialising" as never, "Starting simulation...");

    try {
      await startSimulation();
    } catch (err) {
      console.error("Simulation start failed:", err);
      useSimulationStore
        .getState()
        .setStatus("failed" as never, "Failed to start simulation");
    } finally {
      setIsPending(false);
    }
  };

  // Button text logic — prioritize immediate feedback
  const getButtonContent = () => {
    if (isPending || status === "initialising") {
      return (
        <>
          <Spinner />
          STARTING...
        </>
      );
    }
    
    if (isRunning) {
      return (
        <>
          <Spinner />
          SIMULATING…
        </>
      );
    }
    
    if (isCompleted) {
      return (
        <>
          <RotateCcw size={14} />
          RUN AGAIN
        </>
      );
    }

    return (
      <>
        <Play size={14} fill="currentColor" />
        SIMULATE
      </>
    );
  };

  const isDisabled = isRunning || isPending;

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        style={{
          width: "100%",
          padding: "12px 20px",
          borderRadius: 10,
          border: "none",
          opacity: isDisabled ? 0.75 : 1,
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "#050810",
          background: isRunning || isPending
            ? "linear-gradient(135deg, #007799, #005566)"
            : "linear-gradient(135deg, #00ccff 0%, #0099cc 100%)",
          boxShadow: isRunning || isPending 
            ? "none" 
            : "0 0 30px rgba(0,204,255,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all 0.25s ease",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {getButtonContent()}

        {/* Shimmer effect */}
        {!isDisabled && (
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

      {/* Quick stats */}
      <div className="flex justify-between">
        <QuickStat label="METHOD" value={useSimulationStore.getState().config.routing_method} />
        <QuickStat label="ORDERS" value={String(useSimulationStore.getState().config.order_count)} />
        <QuickStat label="DRIVERS" value={String(useSimulationStore.getState().config.driver_count)} />
      </div>
    </div>
  );
}

// Keep your existing helper components
function QuickStat({ label, value }: { label: string; value: string }) {
  const displayValue = label === "METHOD" 
    ? value.replace("_", " ").toUpperCase() 
    : value;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 8,
        color: "#3a6080",
        letterSpacing: "0.1em",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 10,
        color: "#7fb3d0",
      }}>
        {displayValue}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        border: "2px solid rgba(5,8,16,0.4)",
        borderTopColor: "#050810",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

// Add this once (you can keep it at the bottom)
const spinStyle = document.createElement("style");
spinStyle.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
`;
if (!document.getElementById("simulate-button-styles")) {
  spinStyle.id = "simulate-button-styles";
  document.head.appendChild(spinStyle);
}