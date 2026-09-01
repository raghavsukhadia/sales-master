"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSalesmanAction } from "@/app/(dashboard)/salesmen/actions";
import { SalesmenTable, type SalesmanRow } from "./salesmen-table";

interface SalesmenPageClientProps {
  salesmen: SalesmanRow[];
}

export function SalesmenPageClient({ salesmen }: SalesmenPageClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setShowForm(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    setError(null);

    const formData = new FormData(form);
    const result = await createSalesmanAction(formData);
    setSubmitting(false);

    if (result.success) {
      form.reset();
      setShowForm(false);
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Salesmen</h1>
        {!showForm ? (
          <Button type="button" onClick={() => setShowForm(true)}>
            Add salesman
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add salesman</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fullName">Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    required
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
                    placeholder="e.g. rahul@company.com"
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    disabled={submitting}
                  />
                </div>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create salesman"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <SalesmenTable salesmen={salesmen} />
    </div>
  );
}
