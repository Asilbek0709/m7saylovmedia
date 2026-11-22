"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createOutlet,
  deleteOutlet,
  updateOutlet,
  type OutletInput,
  type Ownership,
} from "@/app/actions/outlets";
import { REGIONS, regionLabel } from "@/lib/regions";

export interface OutletRow {
  id: string;
  name: string;
  website: string | null;
  ownership: Ownership;
  region: string;
  evaluations: number;
}

export interface OutletsManagerProps {
  outlets: OutletRow[];
  canManage: boolean;
  /** Удалять издания может только администратор. */
  isAdmin: boolean;
  hint: "demo" | "signin" | "pending" | null;
}

export function OutletsManager({
  outlets,
  canManage,
  isAdmin,
  hint,
}: OutletsManagerProps) {
  const t = useTranslations("outlets");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [name, setName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [ownership, setOwnership] = React.useState<Ownership>("nodavlat");
  // Регион — ключ из базы (кириллица); подпись — на языке страницы.
  const [region, setRegion] = React.useState(REGIONS[0]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);
  // Правка и удаление в списке — со своей строкой ошибки, отдельно от формы.
  const [listError, setListError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<OutletInput | null>(null);
  const [saving, setSaving] = React.useState(false);

  const startEdit = (outlet: OutletRow) => {
    setListError(null);
    setEditing(outlet.id);
    setDraft({
      name: outlet.name,
      website: outlet.website ?? "",
      ownership: outlet.ownership,
      region: outlet.region,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
    setListError(null);
  };

  const save = async () => {
    if (!editing || !draft) return;
    setSaving(true);
    setListError(null);
    const result = await updateOutlet(editing, draft);
    setSaving(false);
    if (result.ok) {
      cancelEdit();
    } else {
      setListError(
        result.reason === "failed" ? t("updateFailed") : t(result.reason),
      );
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setAdded(null);

    const result = await createOutlet({ name, website, ownership, region });
    setPending(false);

    if (result.ok) {
      setAdded(result.name);
      setName("");
      setWebsite("");
      setRegion(REGIONS[0]);
    } else {
      setError(t(result.reason));
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    setRemoving(id);
    setListError(null);
    const result = await deleteOutlet(id);
    setRemoving(null);
    if (!result.ok) {
      setListError(
        result.reason === "failed" ? t("deleteFailed") : t(result.reason),
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Reveal>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </Reveal>

      {/* ---------------------- форма добавления ---------------------- */}
      <Reveal delay={0.06}>
        <Card className="ms7-surface mt-6">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">{t("addTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {canManage ? (
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="outlet-name">{t("name")}</Label>
                  <Input
                    id="outlet-name"
                    value={name}
                    disabled={pending}
                    placeholder={t("namePlaceholder")}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outlet-website">{t("website")}</Label>
                  <Input
                    id="outlet-website"
                    value={website}
                    disabled={pending}
                    placeholder={t("websitePlaceholder")}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outlet-ownership">{t("ownership")}</Label>
                  <Select
                    value={ownership}
                    disabled={pending}
                    onValueChange={(v) => setOwnership(v as Ownership)}
                  >
                    <SelectTrigger id="outlet-ownership" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nodavlat">{t("nodavlat")}</SelectItem>
                      <SelectItem value="davlat">{t("davlat")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="outlet-region">{t("region")}</Label>
                  <RegionSelect
                    id="outlet-region"
                    value={region}
                    disabled={pending}
                    locale={locale}
                    onChange={setRegion}
                    className="h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  {error && (
                    <p role="alert" className="mb-2 text-xs text-destructive">
                      {error}
                    </p>
                  )}
                  {added && (
                    <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check aria-hidden className="size-3.5" />
                      {t("added")} · {added}
                    </p>
                  )}
                  <Button type="submit" disabled={pending} size="sm">
                    {pending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    {pending ? t("submitting") : t("submit")}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {hint === "signin" && (
                  <>
                    {t("signin")}{" "}
                    <Link
                      href="/login?next=%2Foutlets"
                      className="font-medium text-foreground underline underline-offset-4"
                    >
                      {tCommon("login")}
                    </Link>
                  </>
                )}
                {hint === "pending" && t("pending")}
                {hint === "demo" && t("demo")}
              </p>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {/* ------------------------- список ------------------------- */}
      <Reveal delay={0.12}>
        <Card className="ms7-surface mt-6 overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">{t("listTitle")}</CardTitle>
            <CardDescription>
              {outlets.length} · {t("columnEvaluations")}:{" "}
              {outlets.reduce((s, o) => s + o.evaluations, 0)}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {listError && editing === null && (
              <p role="alert" className="px-6 pb-3 text-xs text-destructive">
                {listError}
              </p>
            )}
            {outlets.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                {t("empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">{t("columnName")}</TableHead>
                      <TableHead className="w-40">
                        {t("columnOwnership")}
                      </TableHead>
                      <TableHead className="w-32">
                        {t("columnRegion")}
                      </TableHead>
                      <TableHead className="w-24 text-center">
                        {t("columnEvaluations")}
                      </TableHead>
                      {canManage && <TableHead className="w-24 pr-6" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
                    {outlets.map((outlet) =>
                      editing === outlet.id && draft ? (
                        <TableRow key={outlet.id}>
                          <TableCell className="pl-6 align-top">
                            <Input
                              aria-label={t("name")}
                              value={draft.name}
                              disabled={saving}
                              onChange={(e) =>
                                setDraft({ ...draft, name: e.target.value })
                              }
                              className="h-8"
                            />
                            <Input
                              aria-label={t("website")}
                              value={draft.website}
                              disabled={saving}
                              placeholder={t("websitePlaceholder")}
                              onChange={(e) =>
                                setDraft({ ...draft, website: e.target.value })
                              }
                              className="mt-1.5 h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Select
                              value={draft.ownership}
                              disabled={saving}
                              onValueChange={(v) =>
                                setDraft({ ...draft, ownership: v as Ownership })
                              }
                            >
                              <SelectTrigger
                                aria-label={t("ownership")}
                                className="h-8 w-full"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nodavlat">
                                  {t("nodavlat")}
                                </SelectItem>
                                <SelectItem value="davlat">
                                  {t("davlat")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            <RegionSelect
                              label={t("region")}
                              value={draft.region}
                              disabled={saving}
                              locale={locale}
                              onChange={(value) =>
                                setDraft({ ...draft, region: value })
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="text-center align-top text-sm text-foreground tabular">
                            <span className="inline-block pt-1.5">
                              {outlet.evaluations}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-right align-top whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("save")}
                              disabled={saving}
                              onClick={save}
                              className="size-8 text-muted-foreground hover:text-foreground"
                            >
                              {saving ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("cancel")}
                              disabled={saving}
                              onClick={cancelEdit}
                              className="size-8 text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-3.5" />
                            </Button>
                            {listError && (
                              <p
                                role="alert"
                                className="mt-1 max-w-48 text-left text-xs whitespace-normal text-destructive"
                              >
                                {listError}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={outlet.id}>
                        <TableCell className="pl-6">
                          <span className="block text-sm font-medium text-foreground">
                            {outlet.name}
                          </span>
                          {outlet.website && (
                            <span className="block text-xs text-muted-foreground">
                              {outlet.website}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {t(outlet.ownership)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {regionLabel(outlet.region, locale)}
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground tabular">
                          {outlet.evaluations}
                        </TableCell>
                        {canManage && (
                          <TableCell className="pr-6 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("edit")}
                              title={t("edit")}
                              disabled={editing !== null || removing !== null}
                              onClick={() => startEdit(outlet)}
                              className="size-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("delete")}
                              title={
                                outlet.evaluations > 0
                                  ? t("hasEvaluations")
                                  : t("delete")
                              }
                              disabled={
                                removing === outlet.id ||
                                editing !== null ||
                                outlet.evaluations > 0
                              }
                              onClick={() => remove(outlet.id)}
                              className="size-8 text-muted-foreground hover:text-destructive"
                            >
                              {removing === outlet.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.18}>
        <div className="mt-5">
          <Button asChild variant="outline" size="sm">
            <Link href="/calculator">{t("openCalculator")}</Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}

/** Выбор региона из списка; незнакомый регион из базы тоже остаётся в списке. */
function RegionSelect({
  id,
  label,
  value,
  disabled,
  locale,
  onChange,
  className,
}: {
  id?: string;
  label?: string;
  value: string;
  disabled: boolean;
  locale: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const options = REGIONS.includes(value) || !value ? REGIONS : [value, ...REGIONS];
  return (
    <Select value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className={`w-full ${className ?? ""}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((r) => (
          <SelectItem key={r} value={r}>
            {regionLabel(r, locale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
