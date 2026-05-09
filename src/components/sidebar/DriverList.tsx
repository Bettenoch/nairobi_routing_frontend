//src/components/sidebar/DriverList.tsx
import { useSimulationStore } from "@/store/simulationStore";
import { DRIVER_STATUS_COLORS } from "@/constants/mapConfig";

const STATUS_ICONS: Record<string, string> = {
  idle: "💤",
  assigned: "📋",
  en_route: "🛵",
  completed: "✅",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "IDLE",
  assigned: "ASSIGNED",
  en_route: "EN ROUTE",
  completed: "DONE",
};

export default function DriverList() {
  const drivers = useSimulationStore((s) => s.drivers);
  const driverList = Object.values(drivers);

  if (driverList.length === 0) return null;

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "#3a6080",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Active Drivers — {driverList.length}
      </div>

      <div className="space-y-2">
        {driverList.map((driver, index) => {
          const statusColor = DRIVER_STATUS_COLORS[driver.status] ?? "#3a6080";
          const isActive = driver.status === "en_route";

          // Fallback to index if id is missing to suppress the React warning
          // though using a stable ID is always preferred.
          const itemKey = driver.id || `driver-${index}`;

          return (
            <div
              key={driver.id}
              style={{
                background: isActive
                  ? "rgba(0,204,255,0.05)"
                  : "rgba(17,24,39,0.6)",
                border: `1px solid ${isActive ? "rgba(0,204,255,0.2)" : "#1e3a5f"}`,
                borderRadius: 8,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.3s ease",
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {STATUS_ICONS[driver.status] ?? "👤"}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 11,
                    color: "#e8f4fd",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {driver.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 8,
                    color: "#3a6080",
                  }}
                >
                  {driver.zone} · {driver.deliveries_completed} deliveries
                </div>
              </div>

              {/* Status badge */}
              <div
                style={{
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: `${statusColor}20`,
                  border: `1px solid ${statusColor}40`,
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  color: statusColor,
                  letterSpacing: "0.08em",
                  flexShrink: 0,
                  boxShadow: isActive ? `0 0 6px ${statusColor}40` : "none",
                }}
              >
                {STATUS_LABELS[driver.status] ?? driver.status.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
