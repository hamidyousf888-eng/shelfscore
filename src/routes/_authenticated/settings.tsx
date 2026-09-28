import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FEATURES } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const company = tenant.company;

  const [form, setForm] = useState({
    name: "",
    legal_name: "",
    email: "",
    phone: "",
    address: "",
    currency: "USD",
    timezone: "UTC",
    default_tax_rate: "0",
    tax_inclusive_pricing: false,
    receipt_footer: "",
  });

  useEffect(() => {
    if (!company) return;
    setForm({
      name: company.name,
      legal_name: company.legal_name ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      address: company.address ?? "",
      currency: company.currency,
      timezone: company.timezone,
      default_tax_rate: String(company.default_tax_rate ?? 0),
      tax_inclusive_pricing: !!company.tax_inclusive_pricing,
      receipt_footer: (company.receipt_settings as { footer?: string } | null)?.footer ?? "",
    });
  }, [company]);

  const saveCompany = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("No company selected");
      const { error } = await supabase
        .from("companies")
        .update({
          name: form.name,
          legal_name: form.legal_name || null,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          currency: form.currency,
          timezone: form.timezone,
          default_tax_rate: Number(form.default_tax_rate) || 0,
          tax_inclusive_pricing: form.tax_inclusive_pricing,
          receipt_settings: { ...(company.receipt_settings ?? {}), footer: form.receipt_footer },
        })
        .eq("id", company.id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        company_id: company.id,
        user_id: tenant.userId,
        actor_email: tenant.email,
        action: "company.settings_updated",
        entity_type: "company",
        entity_id: company.id,
        after_data: { name: form.name, currency: form.currency, timezone: form.timezone },
      });
    },
    onSuccess: () => {
      toast.success("Settings saved");
      tenant.refresh();
      qc.invalidateQueries({ queryKey: ["tenant"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFeature = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      if (!company) throw new Error("No company selected");
      const { error } = await supabase
        .from("feature_flags")
        .upsert(
          { company_id: company.id, scope: "company", feature_key: key, enabled, updated_by: tenant.userId },
          { onConflict: "company_id,feature_key,store_id,register_id" },
        );
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        company_id: company.id,
        user_id: tenant.userId,
        actor_email: tenant.email,
        action: "feature.toggled",
        entity_type: "feature_flag",
        after_data: { feature_key: key, enabled },
      });
    },
    onSuccess: () => {
      toast.success("Module updated");
      tenant.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!company) return null;
  const canManage = tenant.can("company.manage");
  const canFeatures = tenant.can("features.manage");

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company profile, tax defaults, receipts and optional modules."
        breadcrumb={[{ label: "Account" }, { label: "Settings" }]}
      />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="tax">Tax & receipts</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Trading name</Label>
                <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canManage} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-legal">Legal name</Label>
                <Input id="c-legal" value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} disabled={!canManage} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!canManage} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canManage} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-address">Address</Label>
                <Input id="c-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!canManage} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-currency">Currency</Label>
                <Input id="c-currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} disabled={!canManage} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-tz">Timezone</Label>
                <Input id="c-tz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} disabled={!canManage} />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => saveCompany.mutate()} disabled={!canManage || saveCompany.isPending}>
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax and receipts</CardTitle>
              <p className="text-muted-foreground text-sm">
                Defaults used when a product or category has no specific tax setting. Jurisdiction-specific rules are
                configured per product and store; these settings are not a legal compliance certification.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="t-rate">Default tax rate (%)</Label>
                  <Input
                    id="t-rate"
                    type="number"
                    step="0.01"
                    value={form.default_tax_rate}
                    onChange={(e) => setForm({ ...form, default_tax_rate: e.target.value })}
                    disabled={!canManage}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Tax-inclusive pricing</p>
                    <p className="text-muted-foreground text-xs">Shelf prices already contain tax.</p>
                  </div>
                  <Switch
                    checked={form.tax_inclusive_pricing}
                    onCheckedChange={(v) => setForm({ ...form, tax_inclusive_pricing: v })}
                    disabled={!canManage}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-footer">Receipt footer</Label>
                <Textarea
                  id="r-footer"
                  value={form.receipt_footer}
                  onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                  placeholder="Thank you for shopping with us."
                  disabled={!canManage}
                />
              </div>
              <Button onClick={() => saveCompany.mutate()} disabled={!canManage || saveCompany.isPending}>
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Optional modules</CardTitle>
              <p className="text-muted-foreground text-sm">
                Modules your plan includes can be switched on or off for this company. Core capabilities — sign-in,
                permissions, tenant isolation, point of sale, products and inventory — are always on. Every switch is also
                enforced on the server.
              </p>
            </CardHeader>
            <CardContent className="divide-y">
              {FEATURES.map((f) => {
                const planAllows = tenant.planFeatures.some((pf) => pf.feature_key === f.key && pf.enabled);
                const on = tenant.feature(f.key);
                return (
                  <div key={f.key} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {f.name}
                        {!planAllows ? <Badge variant="outline">Not in plan</Badge> : null}
                      </p>
                      <p className="text-muted-foreground text-xs">{f.description}</p>
                    </div>
                    <Switch
                      checked={on}
                      disabled={!planAllows || !canFeatures || toggleFeature.isPending}
                      onCheckedChange={(v) => toggleFeature.mutate({ key: f.key, enabled: v })}
                      aria-label={`Toggle ${f.name}`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
