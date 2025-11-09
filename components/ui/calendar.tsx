"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 text-sm", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button:
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-lg border border-transparent hover:border-border",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "w-9 h-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 rounded-md p-0 font-normal aria-selected:opacity-100",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        ),
        day_selected:
          "bg-brand-500 text-brand-foreground hover:bg-brand-500 hover:text-brand-foreground focus:bg-brand-500 focus:text-brand-foreground",
        day_today: "bg-muted text-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-muted aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) => {
          const glyph =
            orientation === "left"
              ? "‹"
              : orientation === "right"
                ? "›"
                : orientation === "up"
                  ? "˄"
                  : "˅";
          return (
            <span aria-hidden="true" {...iconProps}>
              {glyph}
            </span>
          );
        },
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
