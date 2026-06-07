import { BarChart3 } from "lucide-react";
import type { TrendPoint } from "../types";

export function TrendChart({
  title,
  points,
  dataKey,
  max,
}: {
  title: string;
  points: TrendPoint[];
  dataKey: "unweighted" | "ranked";
  max: number;
}) {
  const width = 800;
  const height = 300;
  const paddingX = 50;
  const paddingY = 40;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const validPoints = points.map((point, index) => ({
    ...point,
    x: paddingX + (usableWidth / Math.max(points.length - 1, 1)) * index,
    y: paddingY + usableHeight - ((point[dataKey] ?? 0) / max) * usableHeight,
  }));

  // Create a smoother path using simple lines but with better SVG styling
  const path = validPoints.length > 0 
    ? validPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
    : "";

  return (
    <article className="chart-card">
      <div className="chart-title">
        <BarChart3 size={20} className="eyebrow" style={{ margin: 0 }} />
        <h2>{title}</h2>
      </div>
      <div style={{ position: "relative", width: "100%", height: "auto" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={paddingX}
                y1={paddingY + usableHeight * (1 - tick)}
                x2={width - paddingX}
                y2={paddingY + usableHeight * (1 - tick)}
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeDasharray="4 4"
              />
              <text
                x={paddingX - 10}
                y={paddingY + usableHeight * (1 - tick)}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize="10"
                fill="currentColor"
                opacity="0.5"
                fontWeight="600"
              >
                {(tick * max).toFixed(1)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {validPoints.map((point, i) => (
            <text
              key={point.label}
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              opacity="0.5"
              fontWeight="600"
            >
              {point.label}
            </text>
          ))}

          {/* Data Path */}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="#0d9488"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 4px 6px rgba(13, 148, 136, 0.2))" }}
            />
          )}

          {/* Data Points */}
          {validPoints.map((point) => (
            <g key={point.label} className="chart-point">
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="white"
                stroke="#0d9488"
                strokeWidth="3"
              />
              {point[dataKey] !== null && (
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill="#0d9488"
                >
                  {point[dataKey]?.toFixed(2)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </article>
  );
}
