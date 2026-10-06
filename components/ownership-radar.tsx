"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from "recharts";

export interface OwnershipRadarDatum {
  axis: string;
  name: string;
  davlat: number | null;
  nodavlat: number | null;
}

/**
 * Радар двух групп собственности. Группы различаются не только цветом,
 * но и рисунком линии (пунктир у государственных) — различимо и в ч/б.
 */
export function OwnershipRadar({
  data,
  labels,
}: {
  data: OwnershipRadarDatum[];
  labels: { davlat: string; nodavlat: string };
}) {
  const hasDavlat = data.some((d) => d.davlat !== null);
  const hasNodavlat = data.some((d) => d.nodavlat !== null);

  return (
    <div className="h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--chart-grid)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tickCount={5}
            angle={64}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
          />
          {hasDavlat && (
            <Radar
              name={labels.davlat}
              dataKey="davlat"
              stroke="var(--group-davlat)"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="var(--group-davlat)"
              fillOpacity={0.08}
              isAnimationActive={false}
              dot={{ r: 2.5, fill: "var(--group-davlat)", strokeWidth: 0 }}
            />
          )}
          {hasNodavlat && (
            <Radar
              name={labels.nodavlat}
              dataKey="nodavlat"
              stroke="var(--group-nodavlat)"
              strokeWidth={2}
              fill="var(--group-nodavlat)"
              fillOpacity={0.14}
              isAnimationActive={false}
              dot={{ r: 2.5, fill: "var(--group-nodavlat)", strokeWidth: 0 }}
            />
          )}
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "var(--chart-axis)" }}
          />
          <Tooltip
            cursor={false}
            content={(props) => <GroupTooltip {...props} labels={labels} />}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GroupTooltip({
  active,
  payload,
  labels,
}: Partial<TooltipContentProps> & {
  labels: { davlat: string; nodavlat: string };
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as OwnershipRadarDatum | undefined;
  if (!datum) return null;

  const rows = [
    { key: "davlat", label: labels.davlat, value: datum.davlat },
    { key: "nodavlat", label: labels.nodavlat, value: datum.nodavlat },
  ].filter((row) => row.value !== null);

  return (
    <div className="min-w-48 rounded-md border border-border bg-popover p-3 shadow-md">
      <p className="text-sm font-semibold text-popover-foreground">
        {datum.name}
      </p>
      <dl className="mt-2 space-y-1 text-xs">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: `var(--group-${row.key})` }}
              />
              {row.label}
            </dt>
            <dd className="font-semibold text-popover-foreground tabular">
              {row.value?.toFixed(1)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
