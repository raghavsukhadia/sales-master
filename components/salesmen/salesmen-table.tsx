"use client";

import { Button } from "@/components/ui/button";

export interface SalesmanRow {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

interface SalesmenTableProps {
  salesmen: SalesmanRow[];
  busyId: string | null;
  onEdit: (salesman: SalesmanRow) => void;
  onToggleActive: (salesman: SalesmanRow) => void;
  onDelete: (salesman: SalesmanRow) => void;
}

export function SalesmenTable({
  salesmen,
  busyId,
  onEdit,
  onToggleActive,
  onDelete,
}: SalesmenTableProps) {
  if (salesmen.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No salesmen yet. Click &quot;Add salesman&quot; to create one.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Name</th>
            <th className="px-4 py-3 text-left font-medium">Phone</th>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {salesmen.map((salesman) => {
            const isBusy = busyId === salesman.id;
            return (
              <tr key={salesman.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">{salesman.full_name}</td>
                <td className="px-4 py-3">{salesman.phone_number}</td>
                <td className="px-4 py-3">{salesman.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      salesman.is_active
                        ? "text-green-700 dark:text-green-400"
                        : "text-muted-foreground"
                    }
                  >
                    {salesman.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => onEdit(salesman)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => onToggleActive(salesman)}
                    >
                      {salesman.is_active ? "Inactive" : "Activate"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(salesman)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
