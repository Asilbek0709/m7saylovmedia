"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sliceHref,
  type OwnershipFilter,
  type SliceFilter,
} from "@/lib/rating-slices";
import { cn } from "@/lib/utils";

/** Radix Select не допускает пустое значение у пункта. */
const ALL_REGIONS = "__all";

export interface RatingFiltersLabels {
  ownership: string;
  region: string;
  allRegions: string;
  reset: string;
  shareHint: string;
  options: Record<OwnershipFilter, string>;
}

/**
 * Фильтры рейтинга. Состояние живёт только в адресе страницы: переключатель
 * собственности — обычные ссылки, регион — переход по новому адресу.
 */
export function RatingFilters({
  filter,
  regions,
  labels,
}: {
  filter: SliceFilter;
  regions: string[];
  labels: RatingFiltersLabels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isFiltered = filter.ownership !== "all" || filter.region !== null;

  const ownershipOptions: OwnershipFilter[] = ["all", "davlat", "nodavlat"];

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-x-5 gap-y-3 transition-opacity",
        pending && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {labels.ownership}
        </p>
        <div
          role="group"
          aria-label={labels.ownership}
          className="inline-flex max-w-full flex-wrap rounded-md border border-border bg-muted/50 p-0.5"
        >
          {ownershipOptions.map((option) => {
            const active = filter.ownership === option;
            return (
              <Link
                key={option}
                href={sliceHref({ ...filter, ownership: option })}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "rounded-[5px] px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {labels.options[option]}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="w-full min-w-0 sm:w-56">
        <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {labels.region}
        </p>
        <Select
          value={filter.region ?? ALL_REGIONS}
          onValueChange={(value) =>
            startTransition(() =>
              router.push(
                sliceHref({
                  ...filter,
                  region: value === ALL_REGIONS ? null : value,
                }),
                { scroll: false },
              ),
            )
          }
        >
          <SelectTrigger aria-label={labels.region} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_REGIONS}>{labels.allRegions}</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFiltered && (
        <Link
          href="/rating"
          scroll={false}
          className="pb-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {labels.reset}
        </Link>
      )}

      <p className="w-full text-xs text-muted-foreground">{labels.shareHint}</p>
    </div>
  );
}
