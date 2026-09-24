import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  Package2,
  PanelLeftClose,
  ScrollText,
  Settings,
  Shield,
  Store,
  ToggleRight,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Gauge; permission?: string; superAdmin?: boolean };

const COMPANY_NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Organisation",
    items: [
      { to: "/stores", label: "Stores", icon: Store, permission: "store.manage" },
      { to: "/devices", label: "Devices & registers", icon: MonitorSmartphone, permission: "device.manage" },
      { to: "/staff", label: "Staff & roles", icon: Users, permission: "staff.manage" },
    ],
  },
  {
    section: "Platform",
    items: [
      { to: "/settings", label: "Company settings", icon: Settings, permission: "company.manage" },
      { to: "/subscription", label: "Subscription", icon: CreditCard },
      { to: "/audit-log", label: "Audit log", icon: ScrollText, permission: "audit.read" },
    ],
  },
];

const ADMIN_NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Platform admin",
    items: [
      { to: "/super-admin", label: "Platform overview", icon: Shield, superAdmin: true },
      { to: "/admin/companies", label: "Companies", icon: Building2, superAdmin: true },
      { to: "/admin/plans", label: "Plans", icon: Package2, superAdmin: true },
      { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, superAdmin: true },
      { to: "/admin/feature-flags", label: "Feature flags", icon: ToggleRight, superAdmin: true },
      { to: "/admin/usage", label: "Usage", icon: Gauge, superAdmin: true },
      { to: "/admin/billing", label: "Billing", icon: CreditCard, superAdmin: true },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const tenant = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const sections = useMemo(() => {
    const visible = COMPANY_NAV.map((s) => ({
      ...s,
      items: s.items.filter((i) => (tenant.company ? !i.permission || tenant.can(i.permission) : false)),
    })).filter((s) => s.items.length);
    return tenant.isSuperAdmin ? [...visible, ...ADMIN_NAV] : visible;
  }, [tenant]);

  const notifications = useQuery({
    enabled: !!tenant.company?.id,
    queryKey: ["notifications", tenant.company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, severity, link, read_at, created_at")
        .eq("company_id", tenant.company!.id)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    if (!tenant.company) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("company_id", tenant.company.id)
      .is("read_at", null);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const expiryDays = daysUntil(tenant.subscription?.expires_at);
  const showExpiryBanner =
    tenant.subscription &&
    expiryDays !== null &&
    tenant.subscription.fixed_alert_enabled &&
    expiryDays <= (tenant.subscription.alert_lead_days ?? 14);

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.section}>
          {!collapsed ? (
            <p className="text-sidebar-foreground/50 px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase">
              {section.section}
            </p>
          ) : null}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                      collapsed && "justify-center",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="bg-background flex min-h-screen">
      <aside
        className={cn(
          "bg-sidebar border-sidebar-border hidden shrink-0 flex-col border-r transition-all md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-3">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground grid size-8 shrink-0 place-items-center rounded-md font-semibold">
            S
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-sidebar-foreground truncate text-sm font-semibold">ShelfSmart POS</p>
              <p className="text-sidebar-foreground/60 truncate text-[11px]">{tenant.company?.name ?? "Platform"}</p>
            </div>
          ) : null}
        </div>
        {nav}
        <div className="border-sidebar-border border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-center"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeftClose className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="bg-sidebar absolute inset-y-0 left-0 flex w-64 flex-col">
            <div className="border-sidebar-border flex h-14 items-center px-4 text-sm font-semibold">
              <span className="text-sidebar-foreground">ShelfSmart POS</span>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-4" />
          </Button>

          {tenant.companies.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="max-w-56">
                  <Building2 className="size-4" />
                  <span className="truncate">{tenant.company?.name ?? "Select company"}</span>
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Companies</DropdownMenuLabel>
                {tenant.companies.map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => tenant.setCompanyId(c.id)}>
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {tenant.stores.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden max-w-48 sm:inline-flex">
                  <Store className="size-4" />
                  <span className="truncate">
                    {tenant.stores.find((s) => s.id === tenant.storeId)?.name ?? "All stores"}
                  </span>
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => tenant.setStoreId(null)}>All stores</DropdownMenuItem>
                <DropdownMenuSeparator />
                {tenant.stores.map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => tenant.setStoreId(s.id)}>
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <div className="flex-1" />

          <Button variant="outline" size="sm" className="hidden lg:inline-flex" onClick={() => setPaletteOpen(true)}>
            Search…
            <kbd className="bg-muted text-muted-foreground ml-2 rounded px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="size-4" />
                {unread > 0 ? (
                  <span className="bg-destructive text-destructive-foreground absolute top-1 right-1 grid size-4 place-items-center rounded-full text-[10px]">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-sm font-medium">Notifications</p>
                <Button variant="ghost" size="sm" onClick={markAllRead} disabled={!unread}>
                  Mark all read
                </Button>
              </div>
              <ScrollArea className="max-h-80">
                {(notifications.data ?? []).length === 0 ? (
                  <p className="text-muted-foreground p-6 text-center text-sm">You're all caught up.</p>
                ) : (
                  <ul className="divide-y">
                    {(notifications.data ?? []).map((n) => (
                      <li key={n.id} className={cn("px-3 py-2.5", !n.read_at && "bg-accent/40")}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{n.title}</p>
                          <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                            {n.severity}
                          </Badge>
                        </div>
                        {n.body ? <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p> : null}
                        <p className="text-muted-foreground mt-1 text-[11px]">{formatDateTime(n.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-full text-xs font-semibold">
                  {(tenant.fullName ?? tenant.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs leading-tight font-medium">{tenant.fullName ?? tenant.email}</span>
                  <span className="text-muted-foreground block text-[11px] leading-tight">{tenant.roleName ?? "No role"}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs font-normal">{tenant.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {showExpiryBanner ? (
          <div className="bg-warning/15 text-warning-foreground border-warning/30 border-b px-4 py-2 text-sm">
            {tenant.subscription?.custom_alert_enabled && tenant.subscription.custom_alert_message
              ? tenant.subscription.custom_alert_message
              : expiryDays! >= 0
                ? `Your subscription expires in ${expiryDays} day${expiryDays === 1 ? "" : "s"}.`
                : `Your subscription expired ${Math.abs(expiryDays!)} day${expiryDays === -1 ? "" : "s"} ago.`}{" "}
            <Link to="/subscription" className="underline underline-offset-2">
              View subscription
            </Link>
          </div>
        ) : null}

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Jump to a page…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          {sections.map((section) => (
            <CommandGroup key={section.section} heading={section.section}>
              {section.items.map((item) => (
                <CommandItem
                  key={item.to}
                  value={item.label}
                  onSelect={() => {
                    setPaletteOpen(false);
                    navigate({ to: item.to });
                  }}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
