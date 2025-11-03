"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

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
import type { OpsClientProfile } from "@/lib/supabase/queries/operations";
import {
  type UpdateOperationsClientInput,
  type UpdateOperationsClientResult,
  type DeleteOperationsClientInput,
  type DeleteOperationsClientResult,
  deleteOperationsClient,
} from "@/app/(dashboard)/ops/clients/actions";

type ClientEditDialogProps = {
  profile: OpsClientProfile;
  onSubmit: (input: UpdateOperationsClientInput) => Promise<UpdateOperationsClientResult>;
  onDelete: (input: DeleteOperationsClientInput) => Promise<DeleteOperationsClientResult>;
};

type FormState = {
  fullName: string;
  status: "Active" | "Blocked";
  email: string;
  phone: string;
  emiratesId: string;
  passportNumber: string;
  nationality: string;
  residencyStatus: string;
  dateOfBirth: string;
  employmentEmployer: string;
  employmentPosition: string;
  employmentYears: string;
  monthlyIncome: string;
  existingLoans: string;
  creditScore: string;
  riskGrade: string;
};

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: number;
};

function FormSection({ title, description, children, columns = 2 }: FormSectionProps) {
  const gridClass = columns === 1 ? "" : `sm:grid-cols-${columns}`;
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={`grid gap-4 ${gridClass}`}>{children}</div>
    </div>
  );
}

function buildInitialState(profile: OpsClientProfile): FormState {
  return {
    fullName: profile.fullName ?? "",
    status: profile.status === "Blocked" ? "Blocked" : "Active",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    emiratesId: profile.emiratesId ?? "",
    passportNumber: profile.passportNumber ?? "",
    nationality: profile.nationality ?? "",
    residencyStatus: profile.residencyStatus ?? "",
    dateOfBirth: profile.dateOfBirth ?? "",
    employmentEmployer: profile.employment.employer ?? "",
    employmentPosition: profile.employment.position ?? "",
    employmentYears: profile.employment.years != null ? String(profile.employment.years) : "",
    monthlyIncome: profile.financial.monthlyIncome != null ? String(profile.financial.monthlyIncome) : "",
    existingLoans: profile.financial.existingLoans != null ? String(profile.financial.existingLoans) : "",
    creditScore: profile.financial.creditScore != null ? String(profile.financial.creditScore) : "",
    riskGrade: profile.financial.riskGrade ?? "",
  };
}

export function ClientEditDialog({ profile, onSubmit, onDelete }: ClientEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildInitialState(profile));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  const canSubmit = useMemo(() => {
    return form.fullName.trim().length > 0;
  }, [form.fullName]);

  useEffect(() => {
    if (!open) {
      setForm(buildInitialState(profile));
      setErrorMessage(null);
      setDeleteErrorMessage(null);
    }
  }, [open, profile]);

  function handleChange<K extends keyof FormState>(key: K) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };
  }

  async function submit() {
    setErrorMessage(null);
    const payload: UpdateOperationsClientInput = {
      userId: profile.userId,
      fullName: form.fullName,
      status: form.status,
      email: form.email,
      phone: form.phone,
      emiratesId: form.emiratesId,
      passportNumber: form.passportNumber,
      nationality: form.nationality,
      residencyStatus: form.residencyStatus,
      dateOfBirth: form.dateOfBirth,
      employment: {
        employer: form.employmentEmployer,
        position: form.employmentPosition,
        years: form.employmentYears,
      },
      financial: {
        monthlyIncome: form.monthlyIncome,
        existingLoans: form.existingLoans,
        creditScore: form.creditScore,
        riskGrade: form.riskGrade,
      },
    };

    const result = await onSubmit(payload);

    if (!result.success) {
      setErrorMessage(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleteErrorMessage(null);
    setIsDeleting(true);

    try {
      const result = await onDelete({ userId: profile.userId });

      if (!result.success) {
        setDeleteErrorMessage(result.error);
        return;
      }

      setDeleteOpen(false);
      setOpen(false);
      router.push("/ops/clients");
    } catch (error) {
      setDeleteErrorMessage("Произошла ошибка при удалении клиента.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isPending) return;
    startTransition(submit);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-xl">
            Редактировать
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование клиента</DialogTitle>
            <DialogDescription>
              Обновите контактные данные, идентификационные сведения и финансовый профиль.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormSection title="Основная информация" columns={2}>
              <div className="sm:col-span-2">
                <Label htmlFor="client-fullname">Полное имя</Label>
                <Input
                  id="client-fullname"
                  value={form.fullName}
                  onChange={handleChange("fullName")}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-status">Статус</Label>
                <select
                  id="client-status"
                  value={form.status}
                  onChange={handleChange("status")}
                  className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
            </FormSection>

            <FormSection title="Контактная информация" columns={2}>
              <div>
                <Label htmlFor="client-phone">Телефон</Label>
                <Input
                  id="client-phone"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  className="mt-2"
                  placeholder="+971500000000"
                />
              </div>
              <div>
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  className="mt-2"
                  placeholder="client@example.com"
                />
              </div>
            </FormSection>

            <FormSection title="Документы и идентификация" columns={3}>
              <div>
                <Label htmlFor="client-emirates">Emirates ID</Label>
                <Input
                  id="client-emirates"
                  value={form.emiratesId}
                  onChange={handleChange("emiratesId")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-passport">Паспорт</Label>
                <Input
                  id="client-passport"
                  value={form.passportNumber}
                  onChange={handleChange("passportNumber")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-dob">Дата рождения</Label>
                <Input
                  id="client-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handleChange("dateOfBirth")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-nationality">Национальность</Label>
                <Input
                  id="client-nationality"
                  value={form.nationality}
                  onChange={handleChange("nationality")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-residency">Статус резидентства</Label>
                <Input
                  id="client-residency"
                  value={form.residencyStatus}
                  onChange={handleChange("residencyStatus")}
                  className="mt-2"
                />
              </div>
            </FormSection>

            <FormSection
              title="Финансовая информация"
              description="Данные о занятости и финансовом профиле клиента"
              columns={2}
            >
              <div>
                <Label htmlFor="client-employment-employer">Работодатель</Label>
                <Input
                  id="client-employment-employer"
                  value={form.employmentEmployer}
                  onChange={handleChange("employmentEmployer")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-employment-position">Должность</Label>
                <Input
                  id="client-employment-position"
                  value={form.employmentPosition}
                  onChange={handleChange("employmentPosition")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-employment-years">Стаж (лет)</Label>
                <Input
                  id="client-employment-years"
                  value={form.employmentYears}
                  onChange={handleChange("employmentYears")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-income">Месячный доход</Label>
                <Input
                  id="client-income"
                  value={form.monthlyIncome}
                  onChange={handleChange("monthlyIncome")}
                  className="mt-2"
                  placeholder="AED"
                />
              </div>
              <div>
                <Label htmlFor="client-loans">Текущие кредиты</Label>
                <Input
                  id="client-loans"
                  value={form.existingLoans}
                  onChange={handleChange("existingLoans")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-score">Кредитный рейтинг</Label>
                <Input
                  id="client-score"
                  value={form.creditScore}
                  onChange={handleChange("creditScore")}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="client-risk">Риск-оценка</Label>
                <Input
                  id="client-risk"
                  value={form.riskGrade}
                  onChange={handleChange("riskGrade")}
                  className="mt-2"
                />
              </div>
            </FormSection>

            <FormSection
              title="Документы"
              description="Загрузка документов клиента для идентификации"
              columns={1}
            >
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center">
                  <div className="space-y-2">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Перетащите файлы сюда или нажмите для выбора</p>
                      <p className="text-xs text-muted-foreground">Поддерживаются: PDF, JPG, PNG, DOC (макс. 10MB)</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Добавляйте документы удостоверения личности: Emirates ID, паспорт, виза, удостоверение личности
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-2" disabled>
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Выбрать файлы
                    </Button>
                  </div>
                </div>
              </div>
            </FormSection>

            {errorMessage ? (
              <p className="text-sm text-red-500">{errorMessage}</p>
            ) : null}

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-xl order-2 sm:order-1"
                onClick={() => setDeleteOpen(true)}
                disabled={isPending}
              >
                Удалить клиента
              </Button>
              <div className="flex gap-2 order-1 sm:order-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl"
                  disabled={!canSubmit || isPending}
                >
                  {isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog подтверждения удаления */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Удалить клиента</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить клиента <strong>{profile.fullName}</strong>?
              Это действие нельзя отменить.
              <br /><br />
              <div>
                Будут удалены:
                <ul className="text-xs mt-2 list-disc list-inside">
                  <li>Профиль клиента</li>
                  <li>Все документы клиента</li>
                  <li>Связанные сделки (завершенные/отмененные)</li>
                  <li>Пользователь из системы</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>

          {deleteErrorMessage ? (
            <p className="text-sm text-red-500">{deleteErrorMessage}</p>
          ) : null}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить клиента"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
