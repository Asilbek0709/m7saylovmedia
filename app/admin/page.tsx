import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { RoleControl } from "@/components/admin/role-control";
import { WeightSetForm } from "@/components/admin/weight-set-form";
import { DeleteEvaluationButton } from "@/components/delete-evaluation-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import {
  getEvaluationsForAdmin,
  getPeriods,
  getProfiles,
  getRoundsNeedingConsensus,
  type EvaluationRecord,
} from "@/lib/evaluation-records";
import { getLongDateFormatter } from "@/lib/format-date";
import { formatScore, MS7_CRITERIA } from "@/lib/ms7";
import { cn } from "@/lib/utils";
import { getWeightHistory } from "@/lib/weights";

const TABS = ["users", "consensus", "evaluations", "weights"] as const;
type Tab = (typeof TABS)[number];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser("/admin");
  const t = await getTranslations("admin");

  // Не администратору раздел не существует — не подсказываем, что он есть.
  if (user && user.role !== "admin") notFound();

  const params = await searchParams;
  const tabParam = one(params.tab);
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "users";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
        {t("subtitle")}
      </p>

      {!user ? (
        <p className="mt-6 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          {t("demo")}
        </p>
      ) : (
        <>
          <nav
            aria-label={t("title")}
            className="mt-6 inline-flex max-w-full flex-wrap rounded-md border border-border bg-muted/50 p-0.5"
          >
            {TABS.map((key) => (
              <Link
                key={key}
                href={`/admin?tab=${key}`}
                aria-current={tab === key ? "page" : undefined}
                className={cn(
                  "rounded-[5px] px-3 py-1.5 text-sm transition-colors",
                  tab === key
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`tabs.${key}`)}
              </Link>
            ))}
          </nav>

          <div className="mt-5">
            {tab === "users" && <UsersTab currentUserId={user.id} />}
            {tab === "consensus" && <ConsensusTab />}
            {tab === "evaluations" && (
              <EvaluationsTab period={one(params.period) ?? null} />
            )}
            {tab === "weights" && <WeightsTab />}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function errorLabels() {
  const t = await getTranslations("admin");
  return Object.fromEntries(
    ["unavailable", "forbidden", "invalid", "lastAdmin", "failed"].map((k) => [
      k,
      t(`errors.${k}`),
    ]),
  );
}

async function UsersTab({ currentUserId }: { currentUserId: string }) {
  const t = await getTranslations("admin");
  const formatDate = await getLongDateFormatter();
  const profiles = await getProfiles();
  const errors = await errorLabels();

  // Заявки — наверх: ради них в раздел и заходят.
  const sorted = [...profiles].sort(
    (a, b) =>
      Number(b.role === "pending") - Number(a.role === "pending") ||
      b.createdAt.localeCompare(a.createdAt),
  );
  const pendingCount = profiles.filter((p) => p.role === "pending").length;

  const labels = {
    roles: {
      pending: t("users.roles.pending"),
      expert: t("users.roles.expert"),
      admin: t("users.roles.admin"),
    },
    approve: t("users.approve"),
    saved: t("saved"),
    errors,
  };

  return (
    <Card className="ms7-surface overflow-hidden">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base">{t("tabs.users")}</CardTitle>
        <CardDescription>
          {t("users.subtitle")} {t("users.pendingCount", { count: pendingCount })}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-56 pl-6">{t("users.user")}</TableHead>
                <TableHead className="min-w-40">
                  {t("users.organization")}
                </TableHead>
                <TableHead className="w-40">{t("users.registered")}</TableHead>
                <TableHead className="min-w-72 pr-6">{t("users.role")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
              {sorted.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="pl-6">
                    <span className="block text-sm font-medium text-foreground">
                      {profile.fullName ?? profile.email ?? "—"}
                      {profile.id === currentUserId && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({t("users.you")})
                        </span>
                      )}
                    </span>
                    {profile.fullName && (
                      <span className="block text-xs text-muted-foreground">
                        {profile.email}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {profile.organization ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {formatDate(new Date(profile.createdAt))}
                  </TableCell>
                  <TableCell className="pr-6">
                    <RoleControl
                      userId={profile.id}
                      role={profile.role}
                      labels={labels}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {profiles.length <= 1 && (
          <p className="border-t border-border px-6 pt-3 text-xs text-muted-foreground">
            {t("users.migrationHint")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

async function ConsensusTab() {
  const t = await getTranslations("admin");
  const rounds = await getRoundsNeedingConsensus();

  if (rounds.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        {t("consensus.empty")}
      </p>
    );
  }

  const records = await getEvaluationsForAdmin({
    outletIds: [...new Set(rounds.map((r) => r.outletId))],
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("consensus.subtitle")}</p>
      {rounds.map((round) => {
        const items = records.filter(
          (r) => r.outletId === round.outletId && r.period === round.period,
        );
        const smsis = items.map((r) => r.smsi);
        return (
          <Card
            key={`${round.outletId}|${round.period}`}
            className="ms7-surface overflow-hidden"
          >
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base">
                <Link
                  href={`/outlets/${round.outletSlug}`}
                  className="underline-offset-4 hover:underline"
                >
                  {round.outletName}
                </Link>
              </CardTitle>
              <CardDescription className="tabular">
                {round.period} · {t("consensus.round")} {round.smsi.toFixed(1)} ·{" "}
                <span className="font-medium text-destructive">
                  {t("consensus.range", { range: round.smsiRange.toFixed(1) })}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <EvaluationTable
                items={items}
                mark={(r) =>
                  r.smsi === Math.max(...smsis)
                    ? t("consensus.max")
                    : r.smsi === Math.min(...smsis)
                      ? t("consensus.min")
                      : null
                }
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function EvaluationsTab({ period }: { period: string | null }) {
  const t = await getTranslations("admin");
  const periods = await getPeriods();
  const active = period && periods.includes(period) ? period : periods[0];
  const items = active ? await getEvaluationsForAdmin({ period: active }) : [];

  return (
    <Card className="ms7-surface overflow-hidden">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base">{t("tabs.evaluations")}</CardTitle>
        <CardDescription>{t("evaluations.subtitle")}</CardDescription>
        {periods.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted-foreground">
              {t("evaluations.period")}:
            </span>
            {periods.map((p) => (
              <Link
                key={p}
                href={`/admin?tab=evaluations&period=${encodeURIComponent(p)}`}
                aria-current={p === active ? "true" : undefined}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  p === active
                    ? "border-foreground/30 bg-secondary font-medium text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </Link>
            ))}
            <span className="ml-auto text-xs text-muted-foreground tabular">
              {t("evaluations.count", { count: items.length })}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            {t("evaluations.empty")}
          </p>
        ) : (
          <EvaluationTable items={items} withOutlet withDelete />
        )}
      </CardContent>
    </Card>
  );
}

async function EvaluationTable({
  items,
  withOutlet = false,
  withDelete = false,
  mark,
}: {
  items: EvaluationRecord[];
  withOutlet?: boolean;
  withDelete?: boolean;
  mark?: (record: EvaluationRecord) => string | null;
}) {
  const t = await getTranslations("admin");
  const tm = await getTranslations("my");
  const tc = await getTranslations("criteria");
  const formatDate = await getLongDateFormatter();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {withOutlet && (
              <TableHead className="min-w-40 pl-6">{tm("columns.outlet")}</TableHead>
            )}
            <TableHead className={cn("min-w-48", !withOutlet && "pl-6")}>
              {t("evaluations.expert")}
            </TableHead>
            {MS7_CRITERIA.map((c) => (
              <TableHead
                key={c.id}
                title={tc(`${c.id}.name`)}
                className="w-12 text-center"
              >
                {tc(`${c.id}.code`)}
              </TableHead>
            ))}
            <TableHead className="w-20 text-right">SMSI</TableHead>
            <TableHead className={cn("w-36", !withDelete && "pr-6")}>
              {tm("columns.date")}
            </TableHead>
            {withDelete && (
              <TableHead className="w-28 pr-6">
                <span className="sr-only">{tm("columns.actions")}</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
          {items.map((record) => {
            const label = mark?.(record) ?? null;
            return (
              <TableRow key={record.id}>
                {withOutlet && (
                  <TableCell className="pl-6 text-sm font-medium">
                    <Link
                      href={`/outlets/${record.outletSlug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {record.outletName}
                    </Link>
                  </TableCell>
                )}
                <TableCell className={cn("text-sm", !withOutlet && "pl-6")}>
                  {record.evaluator ? (
                    <>
                      <span className="block text-foreground">
                        {record.evaluator.fullName ?? record.evaluator.email}
                      </span>
                      {record.evaluator.fullName && (
                        <span className="block text-xs text-muted-foreground">
                          {record.evaluator.email}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("evaluations.noExpert")}
                    </span>
                  )}
                </TableCell>
                {MS7_CRITERIA.map((c) => (
                  <TableCell key={c.id} className="text-center text-sm tabular">
                    {formatScore(record.scores[c.id])}
                  </TableCell>
                ))}
                <TableCell className="text-right text-sm font-semibold tabular">
                  {record.smsi.toFixed(1)}
                  {label && (
                    <span className="block text-[11px] font-normal text-destructive">
                      {label}
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-sm whitespace-nowrap text-muted-foreground",
                    !withDelete && "pr-6",
                  )}
                >
                  {record.evaluatedAt ? formatDate(record.evaluatedAt) : "—"}
                </TableCell>
                {withDelete && (
                  <TableCell className="pr-6">
                    <DeleteEvaluationButton
                      id={record.id}
                      labels={{
                        delete: tm("delete"),
                        title: tm("deleteTitle"),
                        text: tm("deleteText", {
                          outlet: record.outletName,
                          period: record.period,
                        }),
                        cancel: tm("cancel"),
                        confirm: tm("confirm"),
                        deleting: tm("deleting"),
                        failed: tm("deleteFailed"),
                      }}
                    />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function WeightsTab() {
  const t = await getTranslations("admin");
  const tc = await getTranslations("criteria");
  const tMethod = await getTranslations("methodology");
  const formatDate = await getLongDateFormatter();
  const history = await getWeightHistory();
  const errors = await errorLabels();

  const latest = history.sets[history.sets.length - 1];
  const nextId = Math.max(...history.sets.map((s) => s.id)) + 1;

  // Новая версия — не раньше сегодня и строго позже последней.
  const today = new Date().toISOString().slice(0, 10);
  const dayAfterLatest = latest.validFrom
    ? new Date(Date.parse(`${latest.validFrom}T00:00:00Z`) + 86_400_000)
        .toISOString()
        .slice(0, 10)
    : today;
  const minDate = dayAfterLatest > today ? dayAfterLatest : today;

  return (
    <Card className="ms7-surface">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base">
          {t("weights.newVersion", { id: nextId })}
        </CardTitle>
        <CardDescription>
          {t("weights.subtitle")} {t("weights.current", { id: history.active.id })}.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <WeightSetForm
          criteria={MS7_CRITERIA.map((c) => ({
            id: c.id,
            code: tc(`${c.id}.code`),
            name: tc(`${c.id}.name`),
          }))}
          initial={history.active.weights}
          minDate={minDate}
          labels={{
            validFrom: t("weights.validFrom"),
            dateHint: t("weights.dateHint", {
              date: latest.validFrom ? formatDate(latest.validFrom) : "—",
            }),
            note: t("weights.note"),
            notePlaceholder: t("weights.notePlaceholder"),
            sum: t.raw("weights.sum") as string,
            sumError: t("weights.sumError"),
            submit: t("weights.submit"),
            success: t("weights.success"),
            errors,
          }}
        />
        <p className="mt-5 text-xs text-muted-foreground">
          {/* История версий уже есть на странице методики — не дублируем. */}
          <Link href="/methodology" className="underline underline-offset-4">
            {tMethod("weights.history")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
