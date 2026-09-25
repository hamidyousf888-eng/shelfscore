import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createCompany } from "@/lib/tenant.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: z.object({ plan: z.string().optional() }),
  component: Onboarding,
});

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "NGN", "KES", "INR", "PKR", "ZAR"];
const TIMEZONES = ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Africa/Lagos", "Africa/Nairobi"];

function Onboarding() {
  const { plan: planParam } = Route.useSearch();
  const navigate = useNavigate();
  const tenant = useTenant();
  const run = useServerFn(createCompany);

  const [companyName, setCompanyName] = useState("");
  const [planSlug, setPlanSlug] = useState(planParam ?? "");
  const [storeName, setStoreName] = useState("Main Store");
  const [storeCode, setStoreCode] = useState("MAIN");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [busy, setBusy] = useState(false);

  const plans = useQuery({
    queryKey: ["public", "plans", "simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, slug, description, base_price_cents, currency, trial_days")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!planSlug && plans.data?.length) setPlanSlug(plans.data[0].slug);
  }, [plans.data, planSlug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await run({
        data: {
          companyName,
          planSlug,
          storeName,
          storeCode: storeCode || slugify(storeName).toUpperCase().slice(0, 8) || "MAIN",
          currency,
          timezone,
          ownerName: tenant.fullName ?? undefined,
        },
      });
      toast.success("Company created. Welcome aboard.");
      tenant.refresh();
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the company.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Set up your company</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        This creates your tenant, its first store and register, the standard role set and your trial subscription.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Company details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company name</Label>
              <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Greenfield Foods" />
            </div>

            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={planSlug} onValueChange={setPlanSlug}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {(plans.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.slug}>
                      {p.name} — {money(p.base_price_cents, p.currency)}/mo · {p.trial_days}-day trial
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="store">First store</Label>
                <Input id="store" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Store code</Label>
                <Input id="code" value={storeCode} onChange={(e) => setStoreCode(e.target.value.toUpperCase())} required maxLength={12} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={busy || !planSlug} className="w-full">
              {busy ? "Creating…" : "Create company"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
