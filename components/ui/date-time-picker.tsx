"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DateTimePickerInputProps = {
  id?: string;
  name?: string;
  value?: string | null;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  displayFormat?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  allowClear?: boolean;
};

const DATE_FORMAT = "d MMM yyyy";
const STORAGE_DATE_FORMAT = "yyyy-MM-dd";
const TIME_STEP_MINUTES = 15;
const BASE_TIME_OPTIONS = createTimeOptions();

type ParsedValue = {
  date?: Date;
  time: string;
};

function createTimeOptions(stepMinutes = TIME_STEP_MINUTES) {
  const totalSteps = Math.round((24 * 60) / stepMinutes);
  return Array.from({ length: totalSteps }, (_, index) => {
    const totalMinutes = index * stepMinutes;
    const hours = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, "0");
    const minutes = (totalMinutes % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  });
}

function parseValue(value?: string | null): ParsedValue {
  if (!value) {
    return { date: undefined, time: "" };
  }
  const [datePart, timePartRaw] = value.split("T");
  if (!datePart) {
    return { date: undefined, time: "" };
  }
  const [year, month, day] = datePart.split("-").map((segment) => Number.parseInt(segment, 10));
  if (!year || !month || !day) {
    return { date: undefined, time: "" };
  }
  const timePart = (timePartRaw ?? "").slice(0, 5);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return { date: undefined, time: timePart };
  }
  return { date, time: timePart };
}

function formatStorageValue(date: Date, time: string) {
  return `${format(date, STORAGE_DATE_FORMAT)}T${time}`;
}

export function DateTimePickerInput({
  id,
  name,
  value,
  onChange,
  placeholder = "Выберите дату и время",
  displayFormat = DATE_FORMAT,
  disabled = false,
  required = false,
  className,
  buttonClassName,
  allowClear = true,
}: DateTimePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = React.useMemo(() => parseValue(value), [value]);
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(parsed.date);
  const [draftTime, setDraftTime] = React.useState(parsed.time);

  React.useEffect(() => {
    if (open) {
      setDraftDate(parsed.date);
      setDraftTime(parsed.time);
    }
  }, [open, parsed.date, parsed.time]);

  const displayLabel = parsed.date
    ? `${format(parsed.date, displayFormat)}${parsed.time ? ` · ${parsed.time}` : ""}`
    : placeholder;

  const timeOptions = React.useMemo(() => {
    if (!draftTime || BASE_TIME_OPTIONS.includes(draftTime)) {
      return BASE_TIME_OPTIONS;
    }
    return [draftTime, ...BASE_TIME_OPTIONS];
  }, [draftTime]);

  const handleCommit = (nextDate?: Date, nextTime?: string) => {
    if (!nextDate || !nextTime) {
      return;
    }
    const safeTime = nextTime.length === 5 ? nextTime : nextTime.slice(0, 5);
    onChange(formatStorageValue(nextDate, safeTime));
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
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between rounded-xl border border-border bg-background px-3 text-left text-sm font-normal shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500",
              !parsed.date && "text-muted-foreground",
              buttonClassName,
            )}
          >
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {displayLabel}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto space-y-3 p-3" align="start">
          <Calendar
            mode="single"
            selected={draftDate}
            onSelect={(nextDate) => {
              setDraftDate(nextDate);
              if (nextDate && draftTime) {
                handleCommit(nextDate, draftTime);
              }
            }}
            initialFocus
          />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Время</p>
            <Select
              value={draftTime || undefined}
              onValueChange={(nextTime) => {
                setDraftTime(nextTime);
                if (draftDate) {
                  handleCommit(draftDate, nextTime);
                }
              }}
            >
              <SelectTrigger className="h-10 rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500">
                <SelectValue placeholder="Выберите время" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {timeOptions.map((timeValue) => (
                  <SelectItem key={timeValue} value={timeValue} className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      {timeValue}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {allowClear ? (
            <div className="flex justify-end">
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
