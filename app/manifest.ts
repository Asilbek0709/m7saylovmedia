import type { MetadataRoute } from "next";

/**
 * Манифест: сайт можно установить на телефон или компьютер как приложение
 * («Добавить на главный экран» / «Установить»). Открывается без адресной
 * строки, с иконкой MS-7. Иконки собирает scripts/build-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MS-7: Saylov-Media",
    short_name: "MS-7",
    description:
      "Saylov jarayonlarini yorituvchi raqamli OAV faoliyatini MS-7 modeli va SMSI indeksi boʻyicha baholash platformasi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f9",
    theme_color: "#0f2a47",
    lang: "uz",
    categories: ["education", "news", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
