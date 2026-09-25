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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/devices")({
  component: DevicesPage,
});

type RegisterRow = {
  id: string;
  name: string;
  code: string | null;
  device_type: string;
  status: string;
  last_seen_at: string | null;
  store_id: string;
};

const DEVICE_TYPES = ["register", "tablet", "mobile", "self_checkout", "kds", "kiosk"];

function DevicesPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const companyId = tenant.company?.id ?? null;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", device_type: "register", store_id: "" });

  const registers = useQuery({
    enabled: !!companyId,
    queryKey: ["registers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registers")
        .select("id, name, code, device_type, status, last_seen_at, store_id")
        .eq("company_id", companyId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as RegisterRow[];
    },
  });

  const limit = tenant.limit("limit.registers");
  const atLimit = limit !== null && (registers.data?.length ?? 0) >= limit;
  const storeName = (id: string) => tenant.stores.find((s) => s.id === id)?.name ?? "—";

  const create = useMutation({
    mutationFn: async () => {
      if (atLimit) throw new Error(`Your plan allows ${limit} registers. Upgrade to add more.`);
      const storeId = form.store_id || tenant.stores[0]?.id;
      if (!storeId) throw new Error("Create a store first.");
      const { error } = await supabase.from("registers").insert({
        company_id: companyId!,
        store_id: storeId,
        name: form.name,
        code: form.code || null,
        device_type: form.device_type,
      });
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        company_id: companyId,
        store_id: storeId,
        user_id: tenant.userId,
        actor_email: tenant.email,
        action: "register.created",
        entity_type: "register",
        after_data: { name: form.name, device_type: form.device_type },
      });
    },
    onSuccess: () => {
      toast.success("Device registered");
      setOpen(false);
      setForm({ name: "", code: "", device_type: "register", store_id: "" });
      qc.invalidateQueries({ queryKey: ["registers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("registers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registers"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<RegisterRow>[] = [
    { id: "name", header: "Device", cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name, exportValue: (r) => r.name },
    { id: "store", header: "Store", cell: (r) => storeName(r.store_id), exportValue: (r) => storeName(r.store_id) },
    { id: "type", header: "Type", cell: (r) => <span className="capitalize">{r.device_type.replace("_", " ")}</span>, exportValue: (r) => r.device_type },
    { id: "code", header: "Code", cell: (r) => r.code ?? "—", exportValue: (r) => r.code ?? "" },
    {
      id: "status",
      header: "Status",
      cell: (r) => <Badge variant={r.status === "active" ? "secondary" : "outline"} className="capitalize">{r.status}</Badge>,
      exportValue: (r) => r.status,
    },
    { id: "seen", header: "Last seen", cell: (r) => (r.last_seen_at ? formatDateTime(r.last_seen_at) : "Never"), exportValue: (r) => r.last_seen_at ?? "" },
    {
      id: "actions",
      header: "",
      className: "text-right",
      cell: (r) =>
        tenant.can("device.manage") ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus.mutate({ id: r.id, status: r.status === "active" ? "disabled" : "active" })}
          >
            {r.status === "active" ? "Disable" : "Enable"}
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Devices & registers"
        description="Registers, tablets and kiosks assigned to your stores. Hardware adapters are configured per device; the app works without hardware."
        breadcrumb={[{ label: "Organisation" }, { label: "Devices" }]}
        actions={
          tenant.can("device.manage") ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={atLimit}>
                  <Plus className="size-4" /> Add device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add device</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="d-name">Name</Label>
                    <Input id="d-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Register 2" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Store</Label>
                    <Select value={form.store_id || tenant.stores[0]?.id || ""} onValueChange={(v) => setForm({ ...form, store_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenant.stores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.device_type} onValueChange={(v) => setForm({ ...form, device_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-code">Code</Label>
                    <Input id="d-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>
                    Add device
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <DataTable
        rows={registers.data ?? []}
        columns={columns}
        loading={registers.isLoading}
        error={registers.error ? (registers.error as Error).message : null}
        searchKeys={(r) => `${r.name} ${r.code ?? ""} ${r.device_type}`}
        exportName="devices"
        emptyTitle="No devices yet"
        emptyBody="Register a till, tablet or kiosk to assign it to a store."
      />
    </div>
  );
}
