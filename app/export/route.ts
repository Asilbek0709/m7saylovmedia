import { getTranslations } from "next-intl/server";

import {
  agreementLevel,
  buildRankMatrix,
  getPeriodAgreement,
  SIGNIFICANCE,
} from "@/lib/agreement";
import { getCurrentUser } from "@/lib/auth";
import { getEvaluationsForAdmin } from "@/lib/evaluation-records";
import { MS7_CRITERIA, resolveBand, SMSI_BANDS } from "@/lib/ms7";
import { getAllDynamics, getRoundRankings } from "@/lib/rankings";
import { getWeightHistory, weightSetFor } from "@/lib/weights";
import { buildXlsx, XLSX_MIME, type Cell, type Sheet } from "@/lib/xlsx";

/**
 * Выгрузка тура в Excel — для таблиц и приложений к диссертации.
 *
 *   GET /export?period=…   (без period — последний тур)
 *
 * Публичные листы: итоги, разброс, согласованность, динамика, методика.
 * Администратор дополнительно получает обезличенные оценки экспертов и
 * матрицу рангов, по которой W Кендалла пересчитывается вручную.
 * Индивидуальные оценки всё равно отдаёт только RLS базы.
 */
export async function GET(request: Request) {
  const t = await getTranslations("export");
  const tc = await getTranslations("criteria");
  const tb = await getTranslations("bands");
  const tr = await getTranslations("rating");

  const requested = new URL(request.url).searchParams.get("period")?.trim() || null;
  const { rows, period, live } = await getRoundRankings(requested);
  const [agreement, weightHistory, dynamics, user] = await Promise.all([
    live ? getPeriodAgreement(period) : null,
    getWeightHistory(),
    getAllDynamics(),
    getCurrentUser(),
  ]);
  const isAdmin = live && user?.role === "admin";

  const codes = MS7_CRITERIA.map((c) => tc(`${c.id}.code`));
  const yesNo = (v: boolean) => (v ? t("yes") : t("no"));

  /* --------------------------- Итоги тура --------------------------- */
  const results: Sheet = {
    name: t("sheets.results"),
    widths: [5, 28, 18, 16, 14, ...codes.map(() => 7), 8, 18, 10, 9, 11, 12, 11],
    rows: [
      [
        t("col.rank"), t("col.outlet"), t("col.website"), t("col.ownership"),
        t("col.region"), ...codes, t("col.smsi"), t("col.level"), t("col.experts"),
        t("col.smsiSd"), t("col.smsiRange"), t("col.needsConsensus"), t("col.weights"),
      ],
      ...rows.map((row): Cell[] => [
        row.rank,
        row.name,
        row.website,
        tr(`ownership.${row.ownership}`),
        row.region,
        ...MS7_CRITERIA.map((c) => row[c.id]),
        row.smsi,
        tb(`${resolveBand(row.smsi).id}.label`),
        row.consensus?.experts ?? null,
        row.consensus?.smsiSd ?? null,
        row.consensus?.smsiRange ?? null,
        row.consensus ? yesNo(row.consensus.needsConsensus) : null,
        row.weightSetId === null ? null : `v${row.weightSetId}`,
      ]),
    ],
  };

  /* ------------------------ Разброс по мезонам ----------------------- */
  const withSpread = rows.filter((r) => r.consensus?.criteria);
  const spread: Sheet | null = withSpread.length
    ? {
        name: t("sheets.spread"),
        widths: [28, 9, ...codes.flatMap(() => [8, 9])],
        rows: [
          [
            t("col.outlet"),
            t("col.experts"),
            ...codes.flatMap((code) => [`${code} ${t("col.sd")}`, `${code} ${t("col.range")}`]),
          ],
          ...withSpread.map((row): Cell[] => [
            row.name,
            row.consensus!.experts,
            ...MS7_CRITERIA.flatMap((c) => {
              const s = row.consensus!.criteria![c.id];
              return [s.sd, s.range];
            }),
          ]),
        ],
      }
    : null;

  /* ------------- Оценки экспертов и матрица рангов (админ) ----------- */
  const evaluations = isAdmin ? await getEvaluationsForAdmin({ period }) : [];
  const matrix = evaluations.length ? buildRankMatrix(evaluations) : null;
  const code = (key: string | null) =>
    t("expertCode", { n: (matrix?.experts.indexOf(key ?? "legacy") ?? 0) + 1 });

  const expertsSheet: Sheet | null = evaluations.length
    ? {
        name: t("sheets.experts"),
        widths: [9, 28, ...codes.map(() => 7), 8, 13, 11],
        rows: [
          [t("col.expert"), t("col.outlet"), ...codes, t("col.smsi"), t("col.date"), t("col.weights")],
          ...[...evaluations]
            .sort((a, b) => code(a.evaluatorId).localeCompare(code(b.evaluatorId), undefined, { numeric: true }) || a.outletName.localeCompare(b.outletName))
            .map((e): Cell[] => [
              code(e.evaluatorId),
              e.outletName,
              ...MS7_CRITERIA.map((c) => e.scores[c.id]),
              e.smsi,
              e.evaluatedAt,
              e.weightSetId === null ? null : `v${e.weightSetId}`,
            ]),
          [],
          [t("expertsNote")],
        ],
      }
    : null;

  const ranksSheet: Sheet | null =
    matrix && matrix.outlets.length
      ? {
          name: t("sheets.ranks"),
          widths: [32, ...matrix.experts.map(() => 7), 16],
          rows: [
            [t("col.outlet"), ...matrix.experts.map((x) => code(x)), t("col.sum")],
            ...matrix.outlets.map((o, i): Cell[] => [o.name, ...matrix.ranks[i], matrix.sums[i]]),
            [],
            [t("agreement.experts"), matrix.experts.length],
            [t("agreement.outlets"), matrix.outlets.length],
            [t("ranks.s"), Number(matrix.s.toFixed(2))],
            [t("ranks.ties"), matrix.ties],
            [t("ranks.formula"), matrix.w === null ? null : Number(matrix.w.toFixed(4))],
            [t("agreement.chi2"), matrix.chi2 === null ? null : Number(matrix.chi2.toFixed(2))],
            [t("agreement.df"), matrix.df],
            [t("agreement.p"), matrix.p === null ? null : Number(matrix.p.toFixed(4))],
            [],
            [t("ranks.note")],
          ],
        }
      : null;

  /* -------------------------- Согласованность ------------------------ */
  const flagged = rows.filter((r) => r.consensus?.needsConsensus).length;
  const agreementRows: Cell[][] = [
    [t("col.parameter"), t("col.value")],
    [t("agreement.period"), period],
  ];
  if (agreement && agreement.w !== null) {
    agreementRows.push(
      [t("agreement.experts"), agreement.experts],
      [t("agreement.outlets"), agreement.outlets],
      [t("agreement.w"), agreement.w],
      ...(matrix?.w != null
        ? [[t("agreement.wCheck"), Number(matrix.w.toFixed(4))] as Cell[]]
        : []),
      [t("agreement.chi2"), agreement.chi2],
      [t("agreement.df"), agreement.df],
      [t("agreement.p"), agreement.p === null ? null : Number(agreement.p.toFixed(4))],
      [t("agreement.level"), tr(`agreement.levels.${agreementLevel(agreement.w)}`)],
      [
        t("agreement.conclusion"),
        agreement.p === null
          ? null
          : agreement.p < SIGNIFICANCE
            ? tr("agreement.significant")
            : tr("agreement.notSignificant"),
      ],
    );
  } else {
    agreementRows.push(
      [t("agreement.experts"), agreement?.experts ?? null],
      [t("agreement.notComputed")],
    );
  }
  agreementRows.push([t("agreement.flagged"), flagged]);
  const agreementSheet: Sheet = {
    name: t("sheets.agreement"),
    widths: [44, 60],
    rows: agreementRows,
  };

  /* ------------------------------ Динамика --------------------------- */
  const periods: string[] = [];
  for (const cell of dynamics) if (!periods.includes(cell.period)) periods.push(cell.period);
  const outletNames = new Map(dynamics.map((d) => [d.slug, d.name]));
  const dynamicsSheet: Sheet = {
    name: t("sheets.dynamics"),
    widths: [28, ...periods.map(() => 16)],
    rows: [
      [t("col.outlet"), ...periods],
      ...[...outletNames]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([slug, name]): Cell[] => [
          name,
          ...periods.map(
            (p) => dynamics.find((d) => d.slug === slug && d.period === p)?.smsi ?? null,
          ),
        ]),
    ],
  };

  /* ------------------------------ Методика --------------------------- */
  const weightSet = weightSetFor(weightHistory, rows[0]?.weightSetId ?? null);
  const methodSheet: Sheet = {
    name: t("sheets.method"),
    widths: [34, 10, 12],
    rows: [
      [t("col.criterion"), t("col.code"), t("col.weight")],
      ...MS7_CRITERIA.map((c): Cell[] => [tc(`${c.id}.name`), tc(`${c.id}.code`), weightSet.weights[c.id]]),
      [],
      [t("method.formula")],
      [t("method.version"), `v${weightSet.id}`],
      [t("method.validFrom"), weightSet.validFrom ?? "—"],
      [],
      [t("method.bands"), t("col.from"), t("col.to")],
      ...SMSI_BANDS.map((b): Cell[] => [tb(`${b.id}.label`), b.min, b.max]),
      [],
      [t("method.generated"), new Date().toISOString().slice(0, 10)],
      [t("method.source"), new URL("/rating", request.url).toString()],
      ...(live ? [] : [[], [t("method.demo")] as Cell[]]),
    ],
  };

  const sheets = [
    results,
    spread,
    agreementSheet,
    expertsSheet,
    ranksSheet,
    dynamicsSheet,
    methodSheet,
  ].filter((s): s is Sheet => s !== null);

  const bytes = buildXlsx(sheets);
  const filename = `MS7 ${period} ${new Date().toISOString().slice(0, 10)}.xlsx`.replace(
    /[\\/:*?"<>|]+/g,
    " ",
  );

  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": XLSX_MIME,
      // ASCII-имя для старых клиентов, полное — по RFC 5987.
      "Content-Disposition": `attachment; filename="ms7-export.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      // Администратор получает индивидуальные оценки — не кэшировать.
      "Cache-Control": "private, no-store",
    },
  });
}
