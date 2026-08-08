"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { createOutlet, deleteOutlet, type Ownership } from "@/app/actions/outlets";

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
  hint: "demo" | "signin" | "pending" | null;
}

export function OutletsManager({
  outlets,
  canManage,
  hint,
}: OutletsManagerProps) {
  const t = useTranslations("outlets");
  const tCommon = useTranslations("common");

  const [name, setName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [ownership, setOwnership] = React.useState<Ownership>("nodavlat");
  const [region, setRegion] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);

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
      setRegion("");
    } else {
      setError(t(result.reason));
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    setRemoving(id);
    setError(null);
    const result = await deleteOutlet(id);
    setRemoving(null);
    if (!result.ok) setError(t(result.reason));
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
                  <Input
                    id="outlet-region"
                    value={region}
                    disabled={pending}
                    placeholder={t("regionPlaceholder")}
                    onChange={(e) => setRegion(e.target.value)}
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
                      {canManage && <TableHead className="w-16 pr-6" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
                    {outlets.map((outlet) => (
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
                          {outlet.region}
                        </TableCell>
                        <TableCell className="text-center text-sm text-foreground tabular">
                          {outlet.evaluations}
                        </TableCell>
                        {canManage && (
                          <TableCell className="pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("delete")}
                              disabled={removing === outlet.id}
                              onClick={() => remove(outlet.id)}
                              className="size-8 text-muted-foreground hover:text-destructive"
                            >
                              {removing === outlet.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
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
