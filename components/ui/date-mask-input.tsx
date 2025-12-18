"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DateMaskInputProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  value?: string | null;
  onChange: (value: string) => void;
};

export function DateMaskInput({
  value,
  onChange,
  className,
  ...props
}: DateMaskInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  // Convert ISO value (YYYY-MM-DD) to display value (DD.MM.YYYY)
  React.useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        if (year && month && day) {
            setInputValue(`${day}.${month}.${year}`);
            return;
        }
      }
    }
    setInputValue("");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ""); // Remove non-digits
    
    // Limit to 8 digits (DDMMYYYY)
    if (input.length > 8) {
      input = input.slice(0, 8);
    }

    let formatted = "";
    if (input.length > 0) {
      formatted += input.slice(0, 2);
      if (input.length >= 3) {
        formatted += "." + input.slice(2, 4);
      }
      if (input.length >= 5) {
        formatted += "." + input.slice(4, 8);
      }
    }

    setInputValue(formatted);

    // If full date is entered, try to update parent
    if (input.length === 8) {
      const day = input.slice(0, 2);
      const month = input.slice(2, 4);
      const year = input.slice(4, 8);
      
      // Basic validation
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      
      const isValidDate = !isNaN(d) && !isNaN(m) && !isNaN(y) &&
                          d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900 && y < 2100;

      if (isValidDate) {
          // Additional check for days in month
          const dateObj = new Date(y, m - 1, d);
          if (dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d) {
             onChange(`${year}-${month}-${day}`);
             return;
          }
      }
    }
    
    // If we are clearing or invalid, we might want to signal that.
    // But usually we only want to commit valid dates to the state if it expects ISO.
    // If the user clears the input:
    if (input.length === 0) {
        onChange("");
    }
  };

  const handleBlur = () => {
      // On blur, if the input value doesn't match the prop value (formatted), revert it.
      // This handles the case where the user typed a partial date and left.
      if (value) {
          const parts = value.split("-");
          if (parts.length === 3) {
             const [year, month, day] = parts;
             if (year && month && day) {
                const formattedProp = `${day}.${month}.${year}`;
                if (inputValue !== formattedProp) {
                    setInputValue(formattedProp);
                }
                return;
             }
          }
      }
      
      if (inputValue !== "") {
           setInputValue("");
      }
  };

  return (
    <Input
      {...props}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="ДД.ММ.ГГГГ"
      className={cn(className)}
      maxLength={10}
    />
  );
}
