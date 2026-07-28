import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Конфигурация запроса лежит в ./i18n/request.ts — путь по умолчанию.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
