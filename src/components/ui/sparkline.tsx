/**
 * Sparkline Component
 * Purpose: Micro chart for trend visualization
 * Philosophy: Lightweight, SVG-based, no external libs
 */

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  showDots?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#2563eb',
  fillColor = 'rgba(37, 99, 235, 0.1)',
  showDots = false,
  className = '',
}: SparklineProps) {
  const { path, fillPath, dots } = useMemo(() => {
    if (data.length === 0) {
      return { path: '', fillPath: '', dots: [] };
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => ({
      x: (index / (data.length - 1)) * width,
      y: height - ((value - min) / range) * height,
    }));

    // Line path
    const linePath = points
      .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');

    // Fill path (area under line)
    const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

    return {
      path: linePath,
      fillPath: areaPath,
      dots: points,
    };
  }, [data, width, height]);

  if (data.length === 0) {
    return null;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block' }}
    >
      {/* Fill area */}
      <path d={fillPath} fill={fillColor} />

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots (optional) */}
      {showDots &&
        dots.map((dot, index) => (
          <circle
            key={index}
            cx={dot.x}
            cy={dot.y}
            r="2"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        ))}
    </svg>
  );
}

// Bar chart sparkline variant
interface SparkBarsProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function SparkBars({
  data,
  width = 80,
  height = 24,
  color = '#2563eb',
  className = '',
}: SparkBarsProps) {
  const bars = useMemo(() => {
    if (data.length === 0) return [];

    const max = Math.max(...data);
    const barWidth = width / data.length - 1;

    return data.map((value, index) => ({
      x: (index * width) / data.length,
      y: height - (value / max) * height,
      width: barWidth,
      height: (value / max) * height,
      opacity: 0.3 + (value / max) * 0.7,
    }));
  }, [data, width, height]);

  if (data.length === 0) {
    return null;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block' }}
    >
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          fill={color}
          opacity={bar.opacity}
          rx="1"
        />
      ))}
    </svg>
  );
}

// Trend indicator with sparkline
interface TrendSparkProps {
  value: number;
  previousValue: number;
  history?: number[];
  format?: (value: number) => string;
  className?: string;
}

export function TrendSpark({
  value,
  previousValue,
  history = [],
  format = (v) => v.toString(),
  className = '',
}: TrendSparkProps) {
  const trend = value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable';
  const change = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const color = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1">
        <div className="text-2xl font-bold">{format(value)}</div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {trend === 'up' && <span className="text-green-500">↑</span>}
          {trend === 'down' && <span className="text-red-500">↓</span>}
          {trend === 'stable' && <span className="text-gray-500">→</span>}
          <span style={{ color }}>{Math.abs(change).toFixed(1)}%</span>
        </div>
      </div>
      {history.length > 0 && (
        <Sparkline data={history} width={60} height={24} color={color} />
      )}
    </div>
  );
}
