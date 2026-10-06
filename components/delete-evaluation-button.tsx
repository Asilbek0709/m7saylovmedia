"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";

import { deleteEvaluation } from "@/app/actions/evaluations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface DeleteEvaluationLabels {
  delete: string;
  title: string;
  text: string;
  cancel: string;
  confirm: string;
  deleting: string;
  failed: string;
}

/** Удаление необратимо — только через диалог подтверждения. */
export function DeleteEvaluationButton({
  id,
  labels,
}: {
  id: string;
  labels: DeleteEvaluationLabels;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteEvaluation(id);
      if (result.ok) {
        setOpen(false);
      } else {
        setError(labels.failed);
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          {labels.delete}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.text}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {labels.cancel}
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {pending ? labels.deleting : labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
