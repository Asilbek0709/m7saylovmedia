import { cn } from "@/lib/utils";

/**
 * Знак MS-7: скруглённый квадрат-облачко («голос медиа») с монограммой —
 * последняя черта буквы M переходит в цифру 7; золотая точка на углу
 * семёрки. Цвета — из темы (--primary / --primary-foreground), поэтому
 * знак сам подстраивается под светлую и тёмную тему.
 *
 * Тот же рисунок в фиксированных цветах — app/icon.svg (иконка вкладки).
 */
export function LogoMark({
  className,
  title,
}: {
  className?: string;
  /** Подпись для скринридера; без неё знак декоративный. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M16 4h32a12 12 0 0 1 12 12v26a12 12 0 0 1-12 12H26l-14 9V53a12 12 0 0 1-8-11V16A12 12 0 0 1 16 4z"
        fill="var(--primary)"
      />
      <path
        d="M16 42V17l11 15 11-15h11L39 42"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth={5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={49} cy={17} r={3.5} fill="#EF9F27" />
    </svg>
  );
}
