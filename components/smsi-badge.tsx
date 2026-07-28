import { cn } from "@/lib/utils";
import type { SmsiBand } from "@/lib/ms7";

/**
 * Уровень SMSI. Цвет НИКОГДА не идёт без текстовой метки — это условие,
 * на котором держится доступность цветовой шкалы (см. app/globals.css).
 */
export function SmsiBadge({
  band,
  label,
  className,
  size = "md",
}: {
  band: SmsiBand;
  /** Название уровня на текущем языке. */
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className,
      )}
      style={{
        backgroundColor: band.wash,
        color: band.ink,
        borderColor: `color-mix(in srgb, ${band.color} 28%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className={cn("rounded-full", size === "sm" ? "size-1.5" : "size-2")}
        style={{ backgroundColor: band.color }}
      />
      {label}
    </span>
  );
}
