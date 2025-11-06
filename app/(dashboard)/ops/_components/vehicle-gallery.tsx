"use client";

import Image from "next/image";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

const VEHICLE_PLACEHOLDER_PATH = "/assets/vehicle-placeholder.svg";

export type VehicleGalleryImage = {
  id: string;
  url: string | null;
  label?: string | null;
  isPrimary?: boolean;
};

type VehicleGalleryProps = {
  images: VehicleGalleryImage[];
  fallbackImageSrc?: string | null;
  emptyMessage?: string;
  className?: string;
  gridClassName?: string;
  showLabels?: boolean;
  highlightPrimary?: boolean;
};

const DEFAULT_EMPTY_MESSAGE =
  "Фото ещё не загружены. Добавьте изображения в окне редактирования автомобиля.";

export function VehicleGallery({
  images,
  fallbackImageSrc,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  className,
  gridClassName = "grid gap-3 sm:grid-cols-3 lg:grid-cols-4",
  showLabels = true,
  highlightPrimary = true,
}: VehicleGalleryProps) {
  const normalizedImages = useMemo(
    () =>
      images
        .filter((image): image is VehicleGalleryImage & { url: string } => {
          if (!image || typeof image.url !== "string") {
            return false;
          }
          if (image.url.length === 0) {
            return false;
          }
          if (image.url === VEHICLE_PLACEHOLDER_PATH) {
            return false;
          }
          return true;
        })
        .map((image, index) => ({
          id: image.id ?? `vehicle-gallery-${index}`,
          url: image.url,
          label: image.label ?? null,
          isPrimary: Boolean(image.isPrimary),
        })),
    [images],
  );

  if (!normalizedImages.length) {
    const resolvedFallback =
      typeof fallbackImageSrc === "string" && fallbackImageSrc.length > 0 && fallbackImageSrc !== VEHICLE_PLACEHOLDER_PATH
        ? fallbackImageSrc
        : null;

    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-background/50 p-6 text-center", className)}>
        {resolvedFallback ? (
          <div className="relative h-28 w-40 overflow-hidden rounded-lg border border-border/60 bg-background/60">
            <Image src={resolvedFallback} alt="Предпросмотр автомобиля" fill sizes="160px" className="object-cover" />
          </div>
        ) : null}
        {emptyMessage ? <p className="text-sm text-muted-foreground">{emptyMessage}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn(gridClassName, className)}>
      {normalizedImages.map((image) => (
        <div key={image.id} className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-2">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            <Image
              src={image.url}
              alt={image.label ?? "Фото автомобиля"}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
            {highlightPrimary && image.isPrimary ? (
              <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                Основное
              </span>
            ) : null}
          </div>
          {showLabels && image.label ? (
            <p className="truncate text-xs text-muted-foreground" title={image.label}>
              {image.label}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

