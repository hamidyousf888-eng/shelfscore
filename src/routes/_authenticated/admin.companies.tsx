import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminInviteCompany } from "@/lib/tenant.functions";
import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  component: AdminCompanies,
});

type CompanyRow = { id: string; name: string; slug: string; status: string; currency: string; created_at: string };

function AdminCompanies() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const invite = useServerFn(adminInviteCompany);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    adminEmail: "",
    planSlug: "",
    storeName: "Main Store",
    storeCode: "MAIN",
    currency: "USD",
    timezone: "UTC",
    expiresInDays: "365",
    graceDays: "7",
  });

  const companies = useQuery({
    enabled: tenant.isSuperAdmin,
    queryKey: ["admin", "companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, slug, status, currency, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompanyRow[];
    },
  });

  const plans = useQuery({
    enabled: tenant.isSuperAdmin,
    queryKey: ["admin", "plans", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("id, name, slug").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const result = await invite({
        data: {
          companyName: form.companyName,
          adminEmail: form.adminEmail.toLowerCase().trim(),
          planSlug: form.planSlug || (plans.data?.[0]?.slug ?? ""),
          storeName: form.storeName,
          storeCode: form.storeCode.toUpperCase(),
          currency: form.currency,
          timezone: form.timezone,
          expiresInDays: Number(form.expiresInDays) || 365,
          graceDays: Number(form.graceDays) || 7,
        },
      });
      return result;
    },
    onSuccess: () => {
      toast.success("Company created and admin invited. They join when they sign up with that email.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<CompanyRow>[] = [
    { id: "name", header: "Company", cell: (r) => <span className="font-medium">{r.name}</span>, sortValue: (r) => r.name, exportValue: (r) => r.name },
    { id: "slug", header: "Slug", cell: (r) => <span className="numeric text-xs">{r.slug}</span>, exportValue: (r) => r.slug },
    { id: "currency", header: "Currency", cell: (r) => r.currency, exportValue: (r) => r.currency },
    { id: "status", header: "Status", cell: (r) => <Badge variant="outline" className="capitalize">{r.status}</Badge>, exportValue: (r) => r.status },
    { id: "created", header: "Created", cell: (r) => formatDate(r.created_at), sortValue: (r) => r.created_at, exportValue: (r) => r.created_at },
  ];

  if (!tenant.isSuperAdmin) {
    return (
      <div>
        <PageHeader title="Companies" />
        <p className="text-muted-foreground text-sm">This area is limited to platform administrators.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Every subscriber tenant on the platform."
        breadcrumb={[{ label: "Platform" }, { label: "Companies" }]}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Invite company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a company</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ic-name">Company name</Label>
                  <Input id="ic-name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ic-email">Admin email</Label>
                  <Input id="ic-email" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={form.planSlug || plans.data?.[0]?.slug || ""} onValueChange={(v) => setForm({ ...form, planSlug: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {(plans.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.slug}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ic-cur">Currency</Label>
                  <Input id="ic-cur" value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ic-store">First store</Label>
                  <Input id="ic-store" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ic-code">Store code</Label>
                  <Input id="ic-code" value={form.storeCode} onChange={(e) => setForm({ ...form, storeCode: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ic-exp">Expires in (days)</Label>
                  <Input id="ic-exp" type="number" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ic-grace">Grace period (days)</Label>
                  <Input id="ic-grace" type="number" value={form.graceDays} onChange={(e) => setForm({ ...form, graceDays: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={!form.companyName || !form.adminEmail || create.isPending}>
                  Create & invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        rows={companies.data ?? []}
        columns={columns}
        loading={companies.isLoading}
        error={companies.error ? (companies.error as Error).message : null}
        searchKeys={(r) => `${r.name} ${r.slug}`}
        exportName="companies"
        emptyTitle="No companies yet"
        emptyBody="Invite your first subscriber company."
      />
    </div>
  );
}
