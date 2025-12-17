"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchProfiles, getProfile, type ProfileSearchResult } from "@/app/(dashboard)/ops/actions";

type ProfileSelectorProps = {
  value?: string | null;
  onChange: (value: string | null) => void;
  filter: "buyer" | "seller" | "broker";
  label?: string;
  className?: string;
  disabled?: boolean;
  optional?: boolean;
};

export function ProfileSelector({
  value,
  onChange,
  filter,
  label,
  className,
  disabled,
  optional,
}: ProfileSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  
  const [options, setOptions] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null);

  // Initial fetch for selected value
  useEffect(() => {
    if (value && (!selectedProfile || selectedProfile.id !== value)) {
      getProfile(value).then((profile) => {
        if (profile) setSelectedProfile(profile);
      });
    } else if (!value) {
      setSelectedProfile(null);
    }
  }, [value, selectedProfile]);

  // Search effect
  useEffect(() => {
    let active = true;
    setLoading(true);

    searchProfiles(debouncedQuery, filter)
      .then((results) => {
        if (active) {
          setOptions(results);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, filter]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedProfile ? selectedProfile.full_name : "Выберите профиль..."}
          <div className="ml-2 flex items-center gap-1">
            {selectedProfile && !disabled && optional && (
              <div
                role="button"
                tabIndex={0}
                className="rounded-sm p-0.5 hover:bg-muted cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <X className="h-4 w-4 opacity-50" />
              </div>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={`Поиск ${filter === "broker" ? "брокера" : filter === "seller" ? "продавца" : "покупателя"}...`} 
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty>Ничего не найдено.</CommandEmpty>
            )}
            <CommandGroup>
              {options.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setSelectedProfile(currentValue === value ? null : profile);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === profile.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{profile.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {profile.phone || "Нет телефона"} • {profile.entity_type || "N/A"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
