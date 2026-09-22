"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { resolveBand, SMSI_BANDS, SCORE_MAX } from "@/lib/ms7";

export interface DynamicsPoint {
  round: number;
  period: string;
  evaluatedAt: string;
  smsi: number;
}

export interface DynamicsCriterion {
  id: string;
  short: string;
  name: string;
  current: number;
  previous: number | null;
}

export interface DynamicsLabels {
  dynamicsTitle: string;
  dynamicsSubtitle: string;
  needMore: string;
  profileTitle: string;
  profileSubtitle: string;
  current: string;
  previous: string;
  criterion: string;
  period: string;
}

function TrendTooltip({
  active,
  payload,
  labels,
}: TooltipContentProps & { labels: DynamicsLabels }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DynamicsPoint | undefined;
  if (!point) return null;

  const band = resolveBand(point.smsi);

  return (
    <div className="min-w-48 rounded-md border border-border bg-popover p-3 shadow-md">
      <p className="text-[11px] text-muted-foreground">{labels.period}</p>
      <p className="mt-0.5 text-sm font-semibold text-popover-foreground">
        {point.period}
      </p>
      {point.evaluatedAt && (
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular">
          {point.evaluatedAt}
        </p>
      )}
      <Separator className="my-2" />
      <p
        className="text-xl leading-none font-semibold tabular"
        style={{ color: band.color }}
      >
        {point.smsi.toFixed(1)}
      </p>
    </div>
  );
}

export function OutletDynamics({
  points,
  criteria,
  labels,
}: {
  points: DynamicsPoint[];
  criteria: DynamicsCriterion[];
  labels: DynamicsLabels;
}) {
  const hasTrend = points.length >= 2;
  const latestBand = resolveBand(points[points.length - 1]?.smsi ?? 0);
  const hasPrevious = criteria.some((c) => c.previous !== null);

  const radarData = criteria.map((c) => ({
    axis: c.short,
    name: c.name,
    current: c.current,
    previous: c.previous,
  }));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card className="ms7-surface">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">{labels.dynamicsTitle}</CardTitle>
          <CardDescription>{labels.dynamicsSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {hasTrend ? (
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={points}
                  margin={{ top: 8, right: 12, bottom: 4, left: -18 }}
                >
                  {SMSI_BANDS.map((band) => (
                    <ReferenceArea
                      key={band.id}
                      y1={band.min}
                      y2={band.id === "veryhigh" ? SCORE_MAX : band.max + 1}
                      fill={band.color}
                      fillOpacity={0.07}
                      stroke="none"
                    />
                  ))}
                  <CartesianGrid
                    stroke="var(--chart-grid)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="round"
                    tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--chart-grid)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 45, 60, 75, 90, 100]}
                    tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    content={(props) => (
                      <TrendTooltip {...props} labels={labels} />
                    )}
                    cursor={{ stroke: "var(--chart-grid)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="smsi"
                    stroke={latestBand.color}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={{ r: 3.5, fill: latestBand.color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {labels.needMore}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="ms7-surface">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">{labels.profileTitle}</CardTitle>
          <CardDescription>{labels.profileSubtitle}</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
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
                {hasPrevious && (
                  <Radar
                    name={labels.previous}
                    dataKey="previous"
                    stroke="var(--chart-benchmark)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fill="none"
                    isAnimationActive={false}
                    dot={false}
                  />
                )}
                <Radar
                  name={labels.current}
                  dataKey="current"
                  stroke={latestBand.color}
                  strokeWidth={2}
                  fill={latestBand.color}
                  fillOpacity={0.18}
                  isAnimationActive={false}
                  dot={{ r: 3, fill: latestBand.color, strokeWidth: 0 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-0.5 w-5 rounded-full"
                style={{ backgroundColor: latestBand.color }}
              />
              {labels.current}
            </span>
            {hasPrevious && (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-0.5 w-5 rounded-full border-t-2 border-dashed"
                  style={{ borderColor: "var(--chart-benchmark)" }}
                />
                {labels.previous}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
