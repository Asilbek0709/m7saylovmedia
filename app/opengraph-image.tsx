import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE } from "@/i18n/config";
import { DEFAULT_SCORES, MS7_CRITERIA } from "@/lib/ms7";
import { GOLD, NAVY, OG_SIZE, OgMark, OgRadar, ogFonts } from "@/lib/og";

/** Карточка сайта для Telegram и соцсетей — на всех страницах без своей. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "MS-7: Saylov-Media";

export default async function Image() {
  const locale = DEFAULT_LOCALE;
  const [t, tCommon, tc, fonts] = await Promise.all([
    getTranslations({ locale, namespace: "landing" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "criteria" }),
    ogFonts(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: NAVY,
          fontFamily: "Onest",
          position: "relative",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: GOLD,
            opacity: 0.14,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "60px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <OgMark size={64} inverted />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{tCommon("brand")}</div>
              <div style={{ fontSize: 20, color: "#c7d3e3" }}>{tCommon("tagline")}</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 56,
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              maxWidth: 640,
            }}
          >
            {t("title")}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: "auto" }}>
            {[
              ["7", t("stats.criteria")],
              ["100", t("stats.scale")],
              ["5", t("stats.levels")],
            ].map(([value, label]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  padding: "10px 18px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              >
                <span style={{ fontSize: 34, fontWeight: 700, color: GOLD }}>{value}</span>
                <span style={{ fontSize: 20, color: "#c7d3e3" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 460,
            marginRight: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#ffffff",
              borderRadius: 32,
              padding: 18,
            }}
          >
            <OgRadar
              scores={DEFAULT_SCORES}
              color="#2d865d"
              size={380}
              codes={MS7_CRITERIA.map((c) => tc(`${c.id}.code`))}
            />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
