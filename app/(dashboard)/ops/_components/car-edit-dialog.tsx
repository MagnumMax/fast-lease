"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Plus, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OpsVehicleData } from "@/lib/supabase/queries/operations";
import {
  type UpdateOperationsCarInput,
  type UpdateOperationsCarResult,
  updateOperationsCar,
} from "@/app/(dashboard)/ops/cars/actions";

type KeyValueRow = {
  id: string;
  key: string;
  value: string;
};

type CarEditDialogProps = {
  vehicle: OpsVehicleData;
  slug: string;
};

type FormState = {
  vin: string;
  make: string;
  model: string;
  variant: string;
  year: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  engineCapacity: string;
  mileage: string;
  colorExterior: string;
  colorInterior: string;
  status: string;
  purchasePrice: string;
  currentValue: string;
  residualValue: string;
  features: string;
  telematicsOdometer: string;
  telematicsBatteryHealth: string;
  telematicsFuelLevel: string;
  telematicsLocationEntries: KeyValueRow[];
  telematicsTireEntries: KeyValueRow[];
};

function createRow(key = "", value = ""): KeyValueRow {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    key,
    value,
  };
}

function buildEntries(record?: Record<string, unknown>): KeyValueRow[] {
  if (!record) {
    return [createRow()];
  }
  const entries = Object.entries(record).map(([key, value]) => createRow(key, value != null ? String(value) : ""));
  return entries.length > 0 ? entries : [createRow()];
}

function buildFormState(vehicle: OpsVehicleData): FormState {
  const telematics = vehicle.telematics;
  return {
    vin: vehicle.vin ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    variant: vehicle.variant ?? "",
    year: vehicle.year != null ? String(vehicle.year) : "",
    bodyType: vehicle.bodyType ?? "",
    fuelType: vehicle.fuelType ?? "",
    transmission: vehicle.transmission ?? "",
    engineCapacity: vehicle.engineCapacity != null ? String(vehicle.engineCapacity) : "",
    mileage: vehicle.mileage != null ? String(vehicle.mileage) : "",
    colorExterior: vehicle.colorExterior ?? "",
    colorInterior: vehicle.colorInterior ?? "",
    status: vehicle.status ?? "draft",
    purchasePrice: vehicle.purchasePrice != null ? String(vehicle.purchasePrice) : "",
    currentValue: vehicle.currentValue != null ? String(vehicle.currentValue) : "",
    residualValue: vehicle.residualValue != null ? String(vehicle.residualValue) : "",
    features: vehicle.features.length > 0 ? vehicle.features.join("\n") : "",
    telematicsOdometer: telematics?.odometer != null ? String(telematics.odometer) : "",
    telematicsBatteryHealth: telematics?.batteryHealth != null ? String(telematics.batteryHealth) : "",
    telematicsFuelLevel: telematics?.fuelLevel != null ? String(telematics.fuelLevel) : "",
    telematicsLocationEntries: buildEntries(telematics?.location),
    telematicsTireEntries: buildEntries(telematics?.tirePressure),
  };
}

type FormSectionProps = {
  title: string;
  description?: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
};

function FormSection({ title, description, columns = 2, children }: FormSectionProps) {
  const gridClass = columns === 1 ? "" : `sm:grid-cols-${columns}`;
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className={`grid gap-4 ${gridClass}`}>{children}</div>
    </div>
  );
}

function KeyValueList({
  title,
  description,
  entries,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  description?: string;
  entries: KeyValueRow[];
  onChange: (id: string, field: "key" | "value", value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <FormSection title={title} description={description} columns={1}>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/80 p-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ключ</Label>
              <Input
                value={entry.key}
                onChange={(event) => onChange(entry.id, "key", event.currentTarget.value)}
                placeholder="Например, warehouse"
                className="rounded-lg"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Значение</Label>
              <Input
                value={entry.value}
                onChange={(event) => onChange(entry.id, "value", event.currentTarget.value)}
                placeholder="Введите значение"
                className="rounded-lg"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(entry.id)}
              className="self-start rounded-full text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-lg"
        >
          <Plus className="h-4 w-4" /> Добавить поле
        </Button>
      </div>
    </FormSection>
  );
}

export function CarEditDialog({ vehicle, slug }: CarEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildFormState(vehicle));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = useMemo(() => {
    return form.vin.trim().length > 0 && form.make.trim().length > 0 && form.model.trim().length > 0;
  }, [form.make, form.model, form.vin]);

  function resetForm() {
    setForm(buildFormState(vehicle));
    setErrorMessage(null);
  }

  function handleChange(field: keyof FormState) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };
  }

  function updateRow(
    list: "telematicsLocationEntries" | "telematicsTireEntries",
    id: string,
    field: "key" | "value",
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      [list]: prev[list].map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    }));
  }

  function addRow(list: "telematicsLocationEntries" | "telematicsTireEntries") {
    setForm((prev) => ({
      ...prev,
      [list]: [...prev[list], createRow()],
    }));
  }

  function removeRow(list: "telematicsLocationEntries" | "telematicsTireEntries", id: string) {
    setForm((prev) => ({
      ...prev,
      [list]: prev[list].filter((entry) => entry.id !== id),
    }));
  }

  async function submit() {
    setErrorMessage(null);

    const payload: UpdateOperationsCarInput = {
      vehicleId: vehicle.id,
      slug,
      vin: form.vin,
      make: form.make,
      model: form.model,
      variant: form.variant,
      year: form.year,
      bodyType: form.bodyType,
      fuelType: form.fuelType,
      transmission: form.transmission,
      engineCapacity: form.engineCapacity,
      mileage: form.mileage,
      colorExterior: form.colorExterior,
      colorInterior: form.colorInterior,
      status: (form.status as UpdateOperationsCarInput["status"]) ?? "available",
      purchasePrice: form.purchasePrice,
      currentValue: form.currentValue,
      residualValue: form.residualValue,
      features: form.features,
      telematics: {
        odometer: form.telematicsOdometer,
        batteryHealth: form.telematicsBatteryHealth,
        fuelLevel: form.telematicsFuelLevel,
        location: form.telematicsLocationEntries.map(({ key, value }) => ({ key, value })),
        tirePressure: form.telematicsTireEntries.map(({ key, value }) => ({ key, value })),
      },
    };

    const result: UpdateOperationsCarResult = await updateOperationsCar(payload);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    setOpen(false);
    router.replace(`/ops/cars/${result.slug}`);
    router.refresh();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isPending) return;
    startTransition(submit);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">
          Редактировать
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Редактирование автомобиля</DialogTitle>
          <DialogDescription>
            Обновите технические характеристики, финансовые параметры и данные телематики.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormSection title="Основная информация" columns={2}>
            <div className="space-y-1">
              <Label>VIN</Label>
              <Input value={form.vin} onChange={handleChange("vin")} placeholder="Например, WDC12345678900001" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Марка</Label>
              <Input value={form.make} onChange={handleChange("make")} placeholder="Rolls-Royce" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Модель</Label>
              <Input value={form.model} onChange={handleChange("model")} placeholder="Cullinan" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Комплектация</Label>
              <Input value={form.variant} onChange={handleChange("variant")} placeholder="Black Badge" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Год выпуска</Label>
              <Input value={form.year} onChange={handleChange("year")} placeholder="2024" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Тип кузова</Label>
              <Input value={form.bodyType} onChange={handleChange("bodyType")} placeholder="SUV" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Тип топлива</Label>
              <Input value={form.fuelType} onChange={handleChange("fuelType")} placeholder="petrol" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Трансмиссия</Label>
              <Input value={form.transmission} onChange={handleChange("transmission")} placeholder="automatic" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Объём двигателя (л)</Label>
              <Input value={form.engineCapacity} onChange={handleChange("engineCapacity")} placeholder="4.0" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Пробег (км)</Label>
              <Input value={form.mileage} onChange={handleChange("mileage")} placeholder="1200" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Цвет кузова</Label>
              <Input value={form.colorExterior} onChange={handleChange("colorExterior")} placeholder="Obsidian" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Цвет салона</Label>
              <Input value={form.colorInterior} onChange={handleChange("colorInterior")} placeholder="Black" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Статус</Label>
              <select
                value={form.status}
                onChange={handleChange("status")}
                className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="draft">Черновик</option>
                <option value="available">Доступен</option>
                <option value="reserved">Зарезервирован</option>
                <option value="leased">В лизинге</option>
                <option value="maintenance">На обслуживании</option>
                <option value="retired">Списан</option>
              </select>
            </div>
          </FormSection>

          <FormSection title="Финансовые параметры" columns={2}>
            <div className="space-y-1">
              <Label>Закупочная стоимость (AED)</Label>
              <Input value={form.purchasePrice} onChange={handleChange("purchasePrice")} placeholder="1000000" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Текущая стоимость (AED)</Label>
              <Input value={form.currentValue} onChange={handleChange("currentValue")} placeholder="985000" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Остаточная стоимость (AED)</Label>
              <Input value={form.residualValue} onChange={handleChange("residualValue")} placeholder="900000" className="rounded-lg" />
            </div>
          </FormSection>

          <FormSection title="Особенности" columns={1}>
            <div className="space-y-1">
              <Label>Список особенностей</Label>
              <Textarea
                value={form.features}
                onChange={handleChange("features")}
                placeholder="Каждая особенность с новой строки"
                className="min-h-[120px] rounded-lg"
              />
            </div>
          </FormSection>

          <FormSection title="Телематика" columns={2}>
            <div className="space-y-1">
              <Label>Одометр (км)</Label>
              <Input value={form.telematicsOdometer} onChange={handleChange("telematicsOdometer")} placeholder="18420" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Состояние батареи (%)</Label>
              <Input value={form.telematicsBatteryHealth} onChange={handleChange("telematicsBatteryHealth")} placeholder="98.5" className="rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label>Уровень топлива (%)</Label>
              <Input value={form.telematicsFuelLevel} onChange={handleChange("telematicsFuelLevel")} placeholder="82" className="rounded-lg" />
            </div>
          </FormSection>

          <KeyValueList
            title="Телематика: координаты"
            description="Используются для поля location в таблице vehicle_telematics."
            entries={form.telematicsLocationEntries}
            onChange={(id, field, value) => updateRow("telematicsLocationEntries", id, field, value)}
            onAdd={() => addRow("telematicsLocationEntries")}
            onRemove={(id) => removeRow("telematicsLocationEntries", id)}
          />

          <KeyValueList
            title="Телематика: давление в шинах"
            description="Хранится в поле tire_pressure (например, front_left: 2.6)."
            entries={form.telematicsTireEntries}
            onChange={(id, field, value) => updateRow("telematicsTireEntries", id, field, value)}
            onAdd={() => addRow("telematicsTireEntries")}
            onRemove={(id) => removeRow("telematicsTireEntries", id)}
          />

          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              disabled={isPending}
            >
              Отменить
            </Button>
            <Button type="submit" disabled={!canSubmit || isPending} className="rounded-xl">
              {isPending ? "Сохраняем…" : "Сохранить изменения"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
