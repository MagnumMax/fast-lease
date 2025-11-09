"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupportTicketAction } from "./actions";

const initialState = { success: false, error: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-linear hover:bg-slate-800"
      disabled={pending}
    >
      {pending ? "Creating ticket..." : "Submit ticket"}
    </Button>
  );
}

export function SupportForm() {
  const [state, formAction] = useFormState(createSupportTicketAction, initialState);

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById("support-ticket-form") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state.success]);

  return (
    <form id="support-ticket-form" action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="topic" className="text-sm font-medium text-foreground">
            Topic
          </Label>
          <Input
            id="topic"
            name="topic"
            required
            placeholder="Например, вопрос по платежу"
            className="rounded-xl border-border text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="priority" className="text-sm font-medium text-foreground">
            Priority
          </Label>
          <Select name="priority" defaultValue="medium">
            <SelectTrigger id="priority" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Normal</SelectItem>
              <SelectItem value="medium">High</SelectItem>
              <SelectItem value="high">Urgent</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="message" className="text-sm font-medium text-foreground">
          Describe the situation
        </Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Опишите, что случилось, какие шаги уже предприняли."
          className="min-h-[140px]"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-rose-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">
          Запрос создан — оператор свяжется с вами в ближайшее время.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
