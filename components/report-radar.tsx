"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";

export interface ReportRadarDatum {
  axis: string;
  value: number;
}

/**
 * Радар для печатного протокола. Размер фиксирован: ResponsiveContainer
 * меряет ширину на экране и не успевает перемериться под лист при печати.
 */
export function ReportRadar({
  data,
  color,
}: {
  data: ReportRadarDatum[];
  color: string;
}) {
  return (
    <RadarChart
      width={260}
      height={230}
      data={data}
      outerRadius="72%"
      className="mx-auto"
    >
      <PolarGrid stroke="var(--chart-grid)" />
      <PolarAngleAxis
        dataKey="axis"
        tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
      />
      <PolarRadiusAxis
        domain={[0, 100]}
        tickCount={5}
        angle={64}
        axisLine={false}
        tick={{ fill: "var(--chart-axis)", fontSize: 8 }}
      />
      <Radar
        dataKey="value"
        stroke={color}
        strokeWidth={2}
        fill={color}
        fillOpacity={0.15}
        isAnimationActive={false}
        dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
      />
    </RadarChart>
  );
}
