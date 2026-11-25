import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE } from "@/i18n/config";
import { resolveBand } from "@/lib/ms7";
import { BAND_HEX, GOLD, NAVY, OG_SIZE, OgMark, OgRadar, ogFonts } from "@/lib/og";
import { getOutletHistory, getRankings } from "@/lib/rankings";
import { regionLabel } from "@/lib/regions";

/**
 * Карточка издания для Telegram и соцсетей: при отправке ссылки на
 * /outlets/<slug> показывается картинка с индексом, уровнем, местом и
 * радаром. Ботам язык неизвестен — карточка на языке по умолчанию.
 */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "MS-7: Saylov-Media — SMSI";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = DEFAULT_LOCALE;
  const [history, { rows }, tb, tc, tp, tCommon, fonts] = await Promise.all([
    getOutletHistory(slug),
    getRankings(null),
    getTranslations({ locale, namespace: "bands" }),
    getTranslations({ locale, namespace: "criteria" }),
    getTranslations({ locale, namespace: "outlet.profile" }),
    getTranslations({ locale, namespace: "common" }),
    ogFonts(),
  ]);

  const last = history?.points.at(-1) ?? null;
  const band = last ? resolveBand(last.smsi) : null;
  const color = band ? BAND_HEX[band.id] : "#6b7684";
  const ranked = rows.find((r) => r.slug === slug) ?? null;
  const meta = [history?.website, history?.region && regionLabel(history.region, locale)]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f6f7f9",
          fontFamily: "Onest",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -160,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: color,
            opacity: 0.1,
          }}
        />
        <div style={{ display: "flex", flex: 1, padding: "52px 64px 40px" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <OgMark size={52} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: NAVY }}>MS-7: Saylov-Media</div>
                <div style={{ fontSize: 18, color: "#6b7684" }}>{tCommon("tagline")}</div>
              </div>
            </div>

            <div
              style={{
                marginTop: 46,
                fontSize: (history?.name.length ?? 0) > 22 ? 50 : 64,
                fontWeight: 700,
                color: "#16202b",
                letterSpacing: -1.5,
                lineHeight: 1.05,
                maxWidth: 640,
              }}
            >
              {history?.name ?? "MS-7"}
            </div>
            {meta && <div style={{ marginTop: 10, fontSize: 24, color: "#6b7684" }}>{meta}</div>}

            <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: "auto" }}>
              <div style={{ fontSize: 132, fontWeight: 700, lineHeight: 0.9, color, letterSpacing: -4 }}>
                {last ? last.smsi.toFixed(1) : "—"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
                <div style={{ fontSize: 22, color: "#6b7684" }}>SMSI</div>
                {band && (
                  <div
                    style={{
                      display: "flex",
                      alignSelf: "flex-start",
                      padding: "6px 16px",
                      borderRadius: 999,
                      background: "#ffffff",
                      border: `2px solid ${color}`,
                      color,
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    {tb(`${band.id}.label`)}
                  </div>
                )}
                {ranked && (
                  <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#8a5300" }}>
                    {tp("rank", { rank: ranked.rank, total: rows.length })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {last && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 440 }}>
              <OgRadar
                scores={last}
                color={color}
                size={420}
                codes={["legal", "quality", "speed", "multimedia", "interactivity", "engagement", "convergence"].map(
                  (id) => tc(`${id}.code`),
                )}
              />
            </div>
          )}
        </div>

        <div style={{ display: "flex", height: 14 }}>
          <div style={{ flex: 3, background: color }} />
          <div style={{ flex: 1, background: GOLD }} />
          <div style={{ flex: 2, background: NAVY }} />
        </div>
        <div
          style={{
            position: "absolute",
            right: 64,
            bottom: 30,
            fontSize: 20,
            color: "#6b7684",
          }}
        >
          m7saylovmedia.uz
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
