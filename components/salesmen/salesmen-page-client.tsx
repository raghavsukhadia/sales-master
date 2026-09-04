"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createSalesmanAction,
  deleteSalesmanAction,
  setSalesmanActiveAction,
  updateSalesmanAction,
} from "@/app/(dashboard)/salesmen/actions";
import { SalesmenTable, type SalesmanRow } from "./salesmen-table";

interface SalesmenPageClientProps {
  salesmen: SalesmanRow[];
}

type FormMode = "create" | "edit";

export function SalesmenPageClient({ salesmen }: SalesmenPageClientProps) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editing, setEditing] = useState<SalesmanRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function closeForm() {
    setFormMode(null);
    setEditing(null);
    setError(null);
  }

  function openCreate() {
    setEditing(null);
    setFormMode("create");
    setError(null);
    setActionError(null);
  }

  function openEdit(salesman: SalesmanRow) {
    setEditing(salesman);
    setFormMode("edit");
    setError(null);
    setActionError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    setError(null);

    const formData = new FormData(form);
    const result =
      formMode === "edit"
        ? await updateSalesmanAction(formData)
        : await createSalesmanAction(formData);

    setSubmitting(false);

    if (result.success) {
      form.reset();
      closeForm();
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  async function handleToggleActive(salesman: SalesmanRow) {
    const nextActive = !salesman.is_active;
    const label = nextActive ? "activate" : "deactivate";
    if (!window.confirm(`${nextActive ? "Activate" : "Deactivate"} ${salesman.full_name}?`)) {
      return;
    }

    setBusyId(salesman.id);
    setActionError(null);
    const result = await setSalesmanActiveAction(salesman.id, nextActive);
    setBusyId(null);

    if (result.success) {
      if (editing?.id === salesman.id) {
        closeForm();
      }
      router.refresh();
    } else {
      setActionError(result.error ?? `Could not ${label} the salesman.`);
    }
  }

  async function handleDelete(salesman: SalesmanRow) {
    if (
      !window.confirm(
        `Delete ${salesman.full_name}? This cannot be undone. Prefer Inactive if they have visit history.`,
      )
    ) {
      return;
    }

    setBusyId(salesman.id);
    setActionError(null);
    const result = await deleteSalesmanAction(salesman.id);
    setBusyId(null);

    if (result.success) {
      if (editing?.id === salesman.id) {
        closeForm();
      }
      router.refresh();
    } else {
      setActionError(result.error ?? "Could not delete the salesman.");
    }
  }

  const showForm = formMode !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Salesmen</h1>
        {!showForm ? (
          <Button type="button" onClick={openCreate}>
            Add salesman
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {formMode === "edit" ? "Edit salesman" : "Add salesman"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {formMode === "edit" && editing ? (
                <input type="hidden" name="id" value={editing.id} />
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fullName">Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
                    defaultValue={editing?.full_name ?? ""}
                    placeholder="e.g. Rahul Sharma"
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    defaultValue={editing?.phone_number ?? ""}
                    placeholder="e.g. 9876543210"
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email (login ID)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={editing?.email ?? ""}
                    placeholder="e.g. rahul@company.com"
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">
                    {formMode === "edit" ? "New password (optional)" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required={formMode === "create"}
                    minLength={formMode === "create" ? 8 : undefined}
                    placeholder={
                      formMode === "edit" ? "Leave blank to keep current password" : "Min. 8 characters"
                    }
                    disabled={submitting}
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? formMode === "edit"
                      ? "Saving…"
                      : "Creating…"
                    : formMode === "edit"
                      ? "Save changes"
                      : "Create salesman"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      <SalesmenTable
        salesmen={salesmen}
        busyId={busyId}
        onEdit={openEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />
    </div>
  );
}
