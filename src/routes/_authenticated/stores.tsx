import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/stores")({
  component: StoresPage,
});

type StoreRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

function StoresPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const companyId = tenant.company?.id ?? null;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "" });

  const stores = useQuery({
    enabled: !!companyId,
    queryKey: ["stores", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, code, address, phone, is_active, created_at")
        .eq("company_id", companyId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as StoreRow[];
    },
  });

  const limit = tenant.limit("limit.stores");
  const atLimit = limit !== null && (stores.data?.length ?? 0) >= limit;

  const create = useMutation({
    mutationFn: async () => {
      if (atLimit) throw new Error(`Your plan allows ${limit} stores. Upgrade to add more.`);
      const { error } = await supabase.from("stores").insert({
        company_id: companyId!,
        name: form.name,
        code: form.code.toUpperCase(),
        address: form.address || null,
        phone: form.phone || null,
        created_by: tenant.userId,
      });
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        company_id: companyId,
        user_id: tenant.userId,
        actor_email: tenant.email,
        action: "store.created",
        entity_type: "store",
        after_data: { name: form.name, code: form.code },
      });
    },
    onSuccess: () => {
      toast.success("Store created");
      setOpen(false);
      setForm({ name: "", code: "", address: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["stores"] });
      tenant.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (row: StoreRow) => {
      const { error } = await supabase.from("stores").update({ is_active: !row.is_active }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stores"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<StoreRow>[] = [
    { id: "name", header: "Store", cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name, exportValue: (r) => r.name },
    { id: "code", header: "Code", cell: (r) => <span className="numeric">{r.code}</span>, exportValue: (r) => r.code },
    { id: "address", header: "Address", cell: (r) => r.address ?? "—", exportValue: (r) => r.address ?? "" },
    { id: "phone", header: "Phone", cell: (r) => r.phone ?? "—", exportValue: (r) => r.phone ?? "" },
    {
      id: "status",
      header: "Status",
      cell: (r) => <Badge variant={r.is_active ? "secondary" : "outline"}>{r.is_active ? "Active" : "Inactive"}</Badge>,
      exportValue: (r) => (r.is_active ? "active" : "inactive"),
    },
    { id: "created", header: "Created", cell: (r) => formatDate(r.created_at), sortValue: (r) => r.created_at, exportValue: (r) => r.created_at },
    {
      id: "actions",
      header: "",
      className: "text-right",
      cell: (r) =>
        tenant.can("store.manage") ? (
          <Switch checked={r.is_active} onCheckedChange={() => toggleActive.mutate(r)} aria-label={`Toggle ${r.name}`} />
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stores"
        description="Branches, franchise locations and the registers that belong to them."
        breadcrumb={[{ label: "Organisation" }, { label: "Stores" }]}
        actions={
          tenant.can("store.manage") ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={atLimit}>
                  <Plus className="size-4" /> New store
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New store</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-name">Name</Label>
                    <Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-code">Code</Label>
                    <Input id="s-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={12} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-address">Address</Label>
                    <Input id="s-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-phone">Phone</Label>
                    <Input id="s-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => create.mutate()} disabled={!form.name || !form.code || create.isPending}>
                    Create store
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {atLimit ? (
        <p className="bg-warning/15 text-warning-foreground mb-4 rounded-md px-3 py-2 text-sm">
          You have reached the {limit}-store limit on your plan.
        </p>
      ) : null}

      <DataTable
        rows={stores.data ?? []}
        columns={columns}
        loading={stores.isLoading}
        error={stores.error ? (stores.error as Error).message : null}
        searchKeys={(r) => `${r.name} ${r.code} ${r.address ?? ""}`}
        exportName="stores"
        emptyTitle="No stores yet"
        emptyBody="Create your first branch to start assigning registers and staff."
      />
    </div>
  );
}
