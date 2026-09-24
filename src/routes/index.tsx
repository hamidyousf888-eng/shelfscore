import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Boxes, CheckCircle2, ScanBarcode, ShieldCheck, Store, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";
import { FEATURES } from "@/lib/features";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShelfSmart POS — Retail POS, inventory and ERP for multi-store retailers" },
      {
        name: "description",
        content:
          "ShelfSmart POS is a multi-tenant retail operating system: point of sale, batch and expiry inventory, purchasing, ecommerce, delivery and analytics for grocery, pharmacy and franchise retail.",
      },
      { property: "og:title", content: "ShelfSmart POS — Retail operating system" },
      {
        property: "og:description",
        content: "POS, inventory with FEFO batch tracking, purchasing, ecommerce, delivery and reporting in one platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const HIGHLIGHTS = [
  { icon: ScanBarcode, title: "Fast, touch-first POS", body: "Scan, weigh, split payments, hold carts and take approvals without leaving the lane." },
  { icon: Boxes, title: "Batch & expiry inventory", body: "Lot tracking, shelf locations and deterministic FEFO deduction across stores and warehouses." },
  { icon: Store, title: "Multi-store & franchise", body: "Parent company, franchise groups, stores, warehouses and registers with strict isolation." },
  { icon: Truck, title: "Ecommerce & delivery", body: "Storefront tied to live stock, pickup and delivery with driver routing and proof of delivery." },
  { icon: BarChart3, title: "Reports that reconcile", body: "Sales, margin, shrinkage, tax and staff performance drawn from real transactions." },
  { icon: ShieldCheck, title: "Enterprise controls", body: "Granular roles, manager approvals, audit trails and tenant-level data isolation." },
];

function Landing() {
  const plans = useQuery({
    queryKey: ["public", "plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, slug, description, currency, base_price_cents, per_user_price_cents, per_register_price_cents, trial_days, sort_order, plan_features(feature_key, enabled, limit_value)")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="bg-background min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <div className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-md font-semibold">S</div>
          <span className="font-display text-lg font-semibold">ShelfSmart POS</span>
          <div className="flex-1" />
          <a href="#pricing" className="text-muted-foreground hover:text-foreground hidden text-sm sm:block">
            Pricing
          </a>
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start free trial
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <Badge variant="secondary" className="mb-4">
          Multi-tenant retail operating system
        </Badge>
        <h1 className="max-w-3xl text-4xl font-semibold text-balance sm:text-5xl">
          Run every till, shelf, supplier and storefront from one system.
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
          ShelfSmart POS combines point of sale, batch-level inventory, purchasing, ecommerce, delivery, staff and finance
          for grocery stores, pharmacies, foodstuff shops and franchise groups.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create your company
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#pricing">Compare plans</a>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <Card key={h.title}>
              <CardHeader className="pb-2">
                <h.icon className="text-primary size-5" />
                <CardTitle className="text-base">{h.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{h.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-semibold">Plans</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            A platform fee plus optional per-user and per-register charges. Every plan starts with a free trial and can be
            tailored per company by the platform team.
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.isLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)
              : (plans.data ?? []).map((plan) => {
                  const features = (plan.plan_features ?? []) as { feature_key: string; enabled: boolean; limit_value: number | null }[];
                  const limit = (k: string) => features.find((f) => f.feature_key === k)?.limit_value;
                  const included = FEATURES.filter((f) => features.find((pf) => pf.feature_key === f.key && pf.enabled));
                  return (
                    <Card key={plan.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-baseline justify-between">
                          <span>{plan.name}</span>
                          <span className="numeric text-2xl">{money(plan.base_price_cents, plan.currency)}</span>
                        </CardTitle>
                        <p className="text-muted-foreground text-sm">{plan.description}</p>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-4 text-sm">
                        <ul className="text-muted-foreground space-y-1">
                          <li>+ {money(plan.per_user_price_cents, plan.currency)} per user / month</li>
                          <li>+ {money(plan.per_register_price_cents, plan.currency)} per register / month</li>
                          <li>{plan.trial_days}-day free trial</li>
                        </ul>
                        <div className="grid grid-cols-2 gap-2 rounded-md border p-3 text-xs">
                          <span>Stores</span>
                          <span className="numeric text-right">{limit("limit.stores") ?? "—"}</span>
                          <span>Users</span>
                          <span className="numeric text-right">{limit("limit.users") ?? "—"}</span>
                          <span>Registers</span>
                          <span className="numeric text-right">{limit("limit.registers") ?? "—"}</span>
                          <span>Products</span>
                          <span className="numeric text-right">{limit("limit.products") ?? "—"}</span>
                        </div>
                        <ul className="space-y-1.5">
                          {included.slice(0, 8).map((f) => (
                            <li key={f.key} className="flex items-start gap-2">
                              <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
                              <span>{f.name}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex-1" />
                        <Button asChild className="w-full">
                          <Link to="/auth" search={{ mode: "signup", plan: plan.slug }}>
                            Start with {plan.name}
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap gap-2 px-4 text-xs">
          <span>© {new Date().getFullYear()} ShelfSmart POS</span>
          <span>·</span>
          <span>Restricted-item and pharmacy workflows are configurable and are not a legal compliance certification.</span>
        </div>
      </footer>
    </div>
  );
}
