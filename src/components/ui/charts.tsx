/**
 * Simple Chart Components
 * Purpose: Lightweight charts without external dependencies
 * Philosophy: SVG-based, performant, minimal
 */

import { useMemo } from 'react';

interface LineChartProps {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showAxes?: boolean;
  className?: string;
}

export function LineChart({
  data,
  labels = [],
  width = 600,
  height = 300,
  color = '#2563eb',
  showGrid = true,
  showAxes = true,
  className = '',
}: LineChartProps) {
  const { path, points, yAxisLabels } = useMemo(() => {
    if (data.length === 0) return { path: '', points: [], yAxisLabels: [] };

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => ({
      x: padding.left + (index / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((value - min) / range) * chartHeight,
    }));

    const path = points
      .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');

    // Y-axis labels
    const yAxisLabels = Array.from({ length: 6 }, (_, i) => {
      const value = min + (range * i) / 5;
      const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
      return { value: Math.round(value), y };
    });

    return { path, points, yAxisLabels };
  }, [data, width, height]);

  if (data.length === 0) return null;

  return (
    <svg width={width} height={height} className={className}>
      {/* Grid lines */}
      {showGrid && (
        <g>
          {Array.from({ length: 6 }, (_, i) => {
            const y = 20 + (i * (height - 60)) / 5;
            return (
              <line
                key={i}
                x1={60}
                y1={y}
                x2={width - 20}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}
        </g>
      )}

      {/* Y-axis */}
      {showAxes && (
        <>
          <line x1={60} y1={20} x2={60} y2={height - 40} stroke="#6b7280" strokeWidth="2" />
          {yAxisLabels.map((label, i) => (
            <text
              key={i}
              x={50}
              y={label.y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6b7280"
            >
              {label.value}
            </text>
          ))}
        </>
      )}

      {/* X-axis */}
      {showAxes && (
        <>
          <line
            x1={60}
            y1={height - 40}
            x2={width - 20}
            y2={height - 40}
            stroke="#6b7280"
            strokeWidth="2"
          />
          {labels.map((label, i) => {
            const x = 60 + (i / (labels.length - 1)) * (width - 80);
            return (
              <text
                key={i}
                x={x}
                y={height - 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {label}
              </text>
            );
          })}
        </>
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="4"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

interface BarChartProps {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  showValues?: boolean;
  className?: string;
}

export function BarChart({
  data,
  labels = [],
  width = 600,
  height = 300,
  color = '#2563eb',
  showValues = true,
  className = '',
}: BarChartProps) {
  const { bars } = useMemo(() => {
    if (data.length === 0) return { bars: [] };

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const max = Math.max(...data);
    const barWidth = chartWidth / data.length - 10;

    const bars = data.map((value, index) => {
      const barHeight = (value / max) * chartHeight;
      const x = padding.left + (index * chartWidth) / data.length;
      const y = padding.top + chartHeight - barHeight;

      return { x, y, width: barWidth, height: barHeight, value };
    });

    return { bars };
  }, [data, width, height]);

  if (data.length === 0) return null;

  return (
    <svg width={width} height={height} className={className}>
      {/* Y-axis */}
      <line x1={60} y1={20} x2={60} y2={height - 40} stroke="#6b7280" strokeWidth="2" />

      {/* X-axis */}
      <line
        x1={60}
        y1={height - 40}
        x2={width - 20}
        y2={height - 40}
        stroke="#6b7280"
        strokeWidth="2"
      />

      {/* Bars */}
      {bars.map((bar, i) => (
        <g key={i}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={color}
            rx="4"
          />
          {showValues && (
            <text
              x={bar.x + bar.width / 2}
              y={bar.y - 8}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="#1f2937"
            >
              {bar.value}
            </text>
          )}
          {labels[i] && (
            <text
              x={bar.x + bar.width / 2}
              y={height - 20}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
            >
              {labels[i]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

interface PieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  width?: number;
  height?: number;
  showLabels?: boolean;
  className?: string;
}

export function PieChart({
  data,
  width = 300,
  height = 300,
  showLabels = true,
  className = '',
}: PieChartProps) {
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const { slices, total } = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -90; // Start from top

    const slices = data.map((item, i) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle = endAngle;

      // Calculate path
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 40;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      // Label position
      const labelAngle = (startAngle + endAngle) / 2;
      const labelRad = (labelAngle * Math.PI) / 180;
      const labelRadius = radius * 0.7;
      const labelX = centerX + labelRadius * Math.cos(labelRad);
      const labelY = centerY + labelRadius * Math.sin(labelRad);

      return {
        path,
        color: item.color || defaultColors[i % defaultColors.length],
        label: item.label,
        value: item.value,
        percentage: percentage.toFixed(1),
        labelX,
        labelY,
      };
    });

    return { slices, total };
  }, [data, width, height]);

  if (data.length === 0) return null;

  return (
    <svg width={width} height={height} className={className}>
      {/* Slices */}
      {slices.map((slice, i) => (
        <g key={i}>
          <path d={slice.path} fill={slice.color} stroke="white" strokeWidth="2" />
          {showLabels && slice.percentage !== '0.0' && (
            <text
              x={slice.labelX}
              y={slice.labelY}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="white"
            >
              {slice.percentage}%
            </text>
          )}
        </g>
      ))}

      {/* Legend */}
      {showLabels && (
        <g>
          {slices.map((slice, i) => (
            <g key={i} transform={`translate(0, ${height - 60 + i * 20})`}>
              <rect x={10} y={0} width={12} height={12} fill={slice.color} rx="2" />
              <text x={28} y={10} fontSize="12" fill="#6b7280">
                {slice.label}: {slice.value}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

interface AreaChartProps {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  className?: string;
}

export function AreaChart({
  data,
  labels = [],
  width = 600,
  height = 300,
  color = '#2563eb',
  fillOpacity = 0.2,
  className = '',
}: AreaChartProps) {
  const { linePath, areaPath, points } = useMemo(() => {
    if (data.length === 0) return { linePath: '', areaPath: '', points: [] };

    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => ({
      x: padding.left + (index / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((value - min) / range) * chartHeight,
    }));

    const linePath = points
      .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');

    const areaPath = `${linePath} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

    return { linePath, areaPath, points };
  }, [data, width, height]);

  if (data.length === 0) return null;

  return (
    <svg width={width} height={height} className={className}>
      {/* Y-axis */}
      <line x1={60} y1={20} x2={60} y2={height - 40} stroke="#6b7280" strokeWidth="2" />

      {/* X-axis */}
      <line
        x1={60}
        y1={height - 40}
        x2={width - 20}
        y2={height - 40}
        stroke="#6b7280"
        strokeWidth="2"
      />

      {/* X-axis labels */}
      {labels.map((label, i) => {
        const x = 60 + (i / (labels.length - 1)) * (width - 80);
        return (
          <text
            key={i}
            x={x}
            y={height - 20}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
          >
            {label}
          </text>
        );
      })}

      {/* Area */}
      <path d={areaPath} fill={color} fillOpacity={fillOpacity} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="3"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
