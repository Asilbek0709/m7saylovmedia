import { useTranslations } from "next-intl";

import { SmsiBadge } from "@/components/smsi-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SMSI_BANDS } from "@/lib/ms7";
import type { RecommendationPlan } from "@/lib/recommendations";

const BROAD = 3;

export function Recommendations({
  plan,
  className,
}: {
  plan: RecommendationPlan;
  className?: string;
}) {
  const t = useTranslations("recommendations");
  const tc = useTranslations("criteria");
  const tb = useTranslations("bands");

  const nextBand = SMSI_BANDS.find((b) => b.id === plan.nextBand);
  const indicatorName = (criterion: string, index: number) =>
    (tc.raw(`${criterion}.indicators`) as unknown as string[])[index];

  return (
    <Card className={`ms7-surface ${className ?? ""}`}>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>

      <CardContent className="pt-5">
        {nextBand ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <SmsiBadge band={nextBand} label={tb(`${nextBand.id}.label`)} size="sm" />
            <p className="text-sm text-foreground">
              {t("gap", {
                band: tb(`${nextBand.id}.label`),
                gap: plan.gap.toFixed(1),
                from: plan.smsi.toFixed(1),
                to: plan.target ?? 0,
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-foreground">{t("top")}</p>
        )}

        <p className="mt-6 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("prioritiesTitle")}
        </p>
        <ol className="mt-3 space-y-3">
          {plan.priorities.map((p, i) => (
            <li
              key={p.criterion}
              className="rounded-md border border-border bg-muted/30 px-3.5 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-secondary text-[10px] font-semibold text-secondary-foreground tabular"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 text-sm font-medium text-foreground">
                    {tc(`${p.criterion}.name`)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-foreground tabular">
                  {p.score}
                </span>
              </div>
              <p className="mt-1.5 pl-7.5 text-xs text-muted-foreground tabular">
                {t("potential", { value: p.potential.toFixed(1) })} ·{" "}
                {t("per10", { value: p.gainPer10.toFixed(1) })}
              </p>
              {p.weakIndicators.length > 0 && (
                <p className="mt-1.5 pl-7.5 text-xs text-muted-foreground">
                  {t("weakIndicators")}:{" "}
                  <span className="text-foreground">
                    {p.weakIndicators
                      .map((index) => indicatorName(p.criterion, index))
                      .join("; ")}
                  </span>
                </p>
              )}
            </li>
          ))}
        </ol>

        {nextBand && plan.steps.length > 0 && (
          <>
            <Separator className="my-5" />
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("pathTitle")}
            </p>
            {plan.steps.length <= BROAD ? (
              <>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {plan.steps.map((step) => (
                    <li
                      key={step.criterion}
                      className="flex flex-wrap items-baseline justify-between gap-x-3"
                    >
                      <span className="text-foreground">
                        {tc(`${step.criterion}.name`)}
                      </span>
                      <span className="text-muted-foreground tabular">
                        {step.from} → {step.to}{" "}
                        <span className="text-foreground">
                          (+{step.gain.toFixed(1)})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm font-semibold text-foreground tabular">
                  {t("pathResult", { value: plan.projected.toFixed(1) })}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {t("pathBroad", {
                  count: plan.steps.length,
                  target: plan.target ?? 0,
                })}
              </p>
            )}
          </>
        )}

        <p className="mt-5 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("rule")}
        </p>
      </CardContent>
    </Card>
  );
}
