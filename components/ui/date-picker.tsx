"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerInputProps = {
  id?: string;
  name?: string;
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  displayFormat?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  allowClear?: boolean;
  required?: boolean;
};

const STORAGE_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "d MMM yyyy";

const createDateFromValue = (value?: string | null) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

export function DatePickerInput({
  id,
  name,
  value,
  onChange,
  placeholder = "Выберите дату",
  displayFormat = DISPLAY_FORMAT,
  disabled = false,
  className,
  buttonClassName,
  allowClear = true,
  required = false,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = React.useMemo(() => createDateFromValue(value), [value]);
  const canClear = allowClear && !required;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(format(date, STORAGE_FORMAT));
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      {name ? (
        <input
          type="text"
          name={name}
          value={value ?? ""}
          readOnly
          required={required}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
        />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            variant="outline"
            className={cn(
              "h-10 w-full justify-between rounded-xl border border-border bg-background px-3 font-normal text-left text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500",
              !selectedDate && "text-muted-foreground",
              buttonClassName,
            )}
          >
            {selectedDate ? format(selectedDate, displayFormat) : placeholder}
            <CalendarIcon className="ml-2 h-4 w-4 opacity-70" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} initialFocus />
          {canClear ? (
            <div className="mt-2 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                Очистить
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
