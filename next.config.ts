import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";


const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Картинки-превью (opengraph-image) читают шрифт Onest с диска во время
  // запроса — явно кладём его в серверную сборку.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/**"],
    "/outlets/[slug]/opengraph-image": ["./assets/fonts/**"],
  },
};

export default withNextIntl(nextConfig);
