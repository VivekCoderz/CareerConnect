import React, { useState, useMemo } from "react";
import { TrendingUp, Calendar, AlertCircle } from "lucide-react";

const UserGrowthChart = ({ data = [], currentRange = "30d", onRangeChange, usersBreakdown = {} }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const ranges = [
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "3 Months", value: "3m" },
    { label: "6 Months", value: "6m" },
    { label: "1 Year", value: "1y" },
  ];

  // SVG dimensions
  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 35, left: 35 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Process data points
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d) => ({
      date: d.date,
      count: Number(d.registrationCount) || 0,
    }));
  }, [data]);

  const maxVal = useMemo(() => {
    if (points.length === 0) return 5;
    const max = Math.max(...points.map((p) => p.count));
    return max === 0 ? 5 : Math.ceil(max * 1.25);
  }, [points]);

  const totalPeriodRegistrations = useMemo(() => {
    return points.reduce((acc, curr) => acc + curr.count, 0);
  }, [points]);

  // Coordinates calculation
  const coordinates = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length === 1) {
      const y = padding.top + graphHeight - (points[0].count / maxVal) * graphHeight;
      return [
        {
          x: padding.left + graphWidth / 2,
          y,
          ...points[0],
        },
      ];
    }

    return points.map((p, index) => {
      const x = padding.left + (index / (points.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - (p.count / maxVal) * graphHeight;
      return { x, y, ...p };
    });
  }, [points, maxVal, graphWidth, graphHeight, padding]);

  // Area and line paths
  const linePath = useMemo(() => {
    if (coordinates.length === 0) return "";
    if (coordinates.length === 1) return "";
    return coordinates.reduce((path, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${path} L ${pt.x},${pt.y}`;
    }, "");
  }, [coordinates]);

  const areaPath = useMemo(() => {
    if (coordinates.length <= 1) return "";
    const firstX = coordinates[0].x;
    const lastX = coordinates[coordinates.length - 1].x;
    const baselineY = padding.top + graphHeight;
    return `${linePath} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;
  }, [coordinates, linePath, padding, graphHeight]);

  // Total users for breakdown percentages
  const totalUsersCount =
    (usersBreakdown.students || 0) +
    (usersBreakdown.freshers || 0) +
    (usersBreakdown.professionals || 0) +
    (usersBreakdown.employers || 0);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
      {/* Header with Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">User Growth Telemetry</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {totalPeriodRegistrations} in period
            </span>
          </div>
          <p className="text-xs text-slate-400">Verified platform user registrations over time</p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/70 self-start sm:self-auto">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onRangeChange && onRangeChange(r.value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                currentRange === r.value
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="relative">
        {points.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-center p-6">
            <Calendar className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No registration data available yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              New user signups within this timeframe will automatically render here.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-56 select-none"
              style={{ minWidth: "360px" }}
            >
              <defs>
                <linearGradient id="userGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = padding.top + graphHeight * ratio;
                const val = Math.round(maxVal * (1 - ratio));
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94a3b8"
                      fontFamily="sans-serif"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Filled Area */}
              {areaPath && <path d={areaPath} fill="url(#userGrowthGradient)" />}

              {/* Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points & X-axis Labels */}
              {coordinates.map((pt, idx) => {
                const isHovered = hoveredPoint?.date === pt.date;
                // Show subset of labels if many points
                const shouldShowLabel =
                  coordinates.length <= 8 ||
                  idx === 0 ||
                  idx === coordinates.length - 1 ||
                  idx % Math.ceil(coordinates.length / 6) === 0;

                return (
                  <g key={pt.date}>
                    {/* Circle Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill={isHovered ? "#4f46e5" : "#ffffff"}
                      stroke="#4f46e5"
                      strokeWidth={isHovered ? 3 : 2}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />

                    {/* X-axis Date label */}
                    {shouldShowLabel && (
                      <text
                        x={pt.x}
                        y={height - 10}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94a3b8"
                        fontFamily="sans-serif"
                      >
                        {pt.date}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="absolute bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-[11px] shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full transition-all"
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${(hoveredPoint.y / height) * 100 - 4}%`,
                }}
              >
                <p className="font-semibold">{hoveredPoint.count} registrations</p>
                <p className="text-[9px] text-slate-400">{hoveredPoint.date}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Type Distribution Breakdown Footer */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            User Type Breakdown
          </span>
          <span className="text-xs text-slate-400">{totalUsersCount} Total Members</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-medium">Students</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold text-slate-900">
                {(usersBreakdown.students || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">
                {totalUsersCount > 0
                  ? `${Math.round(((usersBreakdown.students || 0) / totalUsersCount) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-medium">Freshers</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold text-slate-900">
                {(usersBreakdown.freshers || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">
                {totalUsersCount > 0
                  ? `${Math.round(((usersBreakdown.freshers || 0) / totalUsersCount) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-medium">Professionals</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold text-slate-900">
                {(usersBreakdown.professionals || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">
                {totalUsersCount > 0
                  ? `${Math.round(((usersBreakdown.professionals || 0) / totalUsersCount) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] text-slate-500 font-medium">Employers</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-base font-bold text-slate-900">
                {(usersBreakdown.employers || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">
                {totalUsersCount > 0
                  ? `${Math.round(((usersBreakdown.employers || 0) / totalUsersCount) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGrowthChart;
