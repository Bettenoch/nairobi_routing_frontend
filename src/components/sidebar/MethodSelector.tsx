//src/components/sidebar/MethodSelector.tsx
import { Info } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useUIStore } from "@/store/uiStore";
import { ROUTING_METHODS } from "@/constants/mapConfig";
import type { RoutingMethod } from "@/types";

interface Props {
  disabled?: boolean;
}

export default function MethodSelector({ disabled }: Props) {
  const { config, setConfig } = useSimulationStore();
  const { openDrawer } = useUIStore();

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
        Routing Method
      </div>

      <div className="space-y-2">
        {ROUTING_METHODS.map((m) => {
          const active = config.routing_method === m.id;
          return (
            <div
              key={m.id}
              onClick={() =>
                !disabled &&
                setConfig({ routing_method: m.id as RoutingMethod })
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !disabled &&
                setConfig({ routing_method: m.id as RoutingMethod })
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${active ? m.color : "#1e3a5f"}`,
                background: active ? `${m.color}18` : "rgba(17,24,39,0.6)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
                transition: "all 0.2s ease",
                boxShadow: active ? `0 0 12px ${m.color}30` : "none",
              }}
            >
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: active ? 700 : 400,
                    fontSize: 12,
                    color: active ? m.color : "#7fb3d0",
                    letterSpacing: "0.04em",
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "#3a6080",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {m.description}
                </div>
              </div>

              {/* Active indicator */}
              {active && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: m.color,
                    boxShadow: `0 0 8px ${m.color}`,
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Info button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer("algorithm", m.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#3a6080",
                  padding: 2,
                  flexShrink: 0,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = m.color)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#3a6080")}
              >
                <Info size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Config sliders */}
      <div className="mt-4 space-y-3">
        <ConfigSlider
          label="Orders"
          value={useSimulationStore.getState().config.order_count}
          min={5}
          max={60}
          step={5}
          disabled={disabled}
          onChange={(v) =>
            useSimulationStore.getState().setConfig({ order_count: v })
          }
          color="#00ccff"
        />
        <ConfigSlider
          label="Drivers"
          value={useSimulationStore.getState().config.driver_count}
          min={1}
          max={8}
          step={1}
          disabled={disabled}
          onChange={(v) =>
            useSimulationStore.getState().setConfig({ driver_count: v })
          }
          color="#7fff00"
        />
      </div>
    </div>
  );
}

function ConfigSlider({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  color,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
  color: string;
}) {
  // Re-subscribe so slider reflects store changes
  const storeConfig = useSimulationStore((s) => s.config);
  const currentValue =
    label === "Orders" ? storeConfig.order_count : storeConfig.driver_count;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "#3a6080",
            letterSpacing: "0.1em",
          }}
        >
          {label.toUpperCase()}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize: 13,
            color,
          }}
        >
          {currentValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: color,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </div>
  );
}
