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
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
});

type MemberRow = {
  id: string;
  user_id: string;
  status: string;
  store_id: string | null;
  created_at: string;
  roles: { name: string; key: string } | null;
  profiles: { email: string | null; full_name: string | null } | null;
};

type InviteRow = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
  roles: { name: string } | null;
};

function StaffPage() {
  const tenant = useTenant();
  const qc = useQueryClient();
  const companyId = tenant.company?.id ?? null;
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role_id: "", store_id: "" });

  const roles = useQuery({
    enabled: !!companyId,
    queryKey: ["roles", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name, key").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const members = useQuery({
    enabled: !!companyId,
    queryKey: ["members", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, user_id, status, store_id, created_at, roles(name, key), profiles(email, full_name)")
        .eq("company_id", companyId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as MemberRow[];
    },
  });

  const invites = useQuery({
    enabled: !!companyId,
    queryKey: ["invites", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_invites")
        .select("id, email, status, expires_at, created_at, roles(name)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InviteRow[];
    },
  });

  const limit = tenant.limit("limit.users");
  const atLimit = limit !== null && (members.data?.length ?? 0) >= limit;

  const sendInvite = useMutation({
    mutationFn: async () => {
      if (atLimit) throw new Error(`Your plan allows ${limit} users. Upgrade to invite more.`);
      const { error } = await supabase.from("company_invites").insert({
        company_id: companyId!,
        email: invite.email.toLowerCase().trim(),
        role_id: invite.role_id || null,
        store_id: invite.store_id || null,
        created_by: tenant.userId,
      });
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        company_id: companyId,
        user_id: tenant.userId,
        actor_email: tenant.email,
        action: "staff.invited",
        entity_type: "company_invite",
        after_data: { email: invite.email },
      });
    },
    onSuccess: () => {
      toast.success("Invite created. Share the sign-up link with your colleague; they join once they register with this email.");
      setOpen(false);
      setInvite({ email: "", role_id: "", store_id: "" });
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("memberships").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const memberColumns: Column<MemberRow>[] = [
    {
      id: "person",
      header: "Person",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.profiles?.full_name ?? "Pending profile"}</p>
          <p className="text-muted-foreground text-xs">{r.profiles?.email ?? r.user_id.slice(0, 8)}</p>
        </div>
      ),
      sortValue: (r) => r.profiles?.full_name ?? "",
      exportValue: (r) => `${r.profiles?.full_name ?? ""} <${r.profiles?.email ?? ""}>`,
    },
    { id: "role", header: "Role", cell: (r) => r.roles?.name ?? "—", exportValue: (r) => r.roles?.name ?? "" },
    {
      id: "store",
      header: "Store scope",
      cell: (r) => (r.store_id ? tenant.stores.find((s) => s.id === r.store_id)?.name ?? "—" : "All stores"),
      exportValue: (r) => r.store_id ?? "all",
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => <Badge variant={r.status === "active" ? "secondary" : "outline"} className="capitalize">{r.status}</Badge>,
      exportValue: (r) => r.status,
    },
    { id: "joined", header: "Joined", cell: (r) => formatDate(r.created_at), sortValue: (r) => r.created_at, exportValue: (r) => r.created_at },
    {
      id: "actions",
      header: "",
      className: "text-right",
      cell: (r) =>
        tenant.can("staff.manage") && r.user_id !== tenant.userId ? (
          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: r.id, status: r.status === "active" ? "suspended" : "active" })}>
            {r.status === "active" ? "Suspend" : "Reactivate"}
          </Button>
        ) : null,
    },
  ];

  const inviteColumns: Column<InviteRow>[] = [
    { id: "email", header: "Email", cell: (r) => r.email, exportValue: (r) => r.email },
    { id: "role", header: "Role", cell: (r) => r.roles?.name ?? "—", exportValue: (r) => r.roles?.name ?? "" },
    { id: "status", header: "Status", cell: (r) => <Badge variant="outline" className="capitalize">{r.status}</Badge>, exportValue: (r) => r.status },
    { id: "expires", header: "Expires", cell: (r) => formatDate(r.expires_at), exportValue: (r) => r.expires_at },
  ];

  return (
    <div>
      <PageHeader
        title="Team"
        description="Memberships, roles and invitations. Roles decide what each person can do; permissions are enforced on the server."
        breadcrumb={[{ label: "Organisation" }, { label: "Team" }]}
        actions={
          tenant.can("staff.manage") ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={atLimit}>
                  <Plus className="size-4" /> Invite person
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a team member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="i-email">Email</Label>
                    <Input id="i-email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={invite.role_id} onValueChange={(v) => setInvite({ ...invite, role_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose role" />
                      </SelectTrigger>
                      <SelectContent>
                        {(roles.data ?? []).map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Store scope</Label>
                    <Select value={invite.store_id} onValueChange={(v) => setInvite({ ...invite, store_id: v === "all" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All stores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All stores</SelectItem>
                        {tenant.stores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => sendInvite.mutate()} disabled={!invite.email || !invite.role_id || sendInvite.isPending}>
                    Create invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <DataTable
        rows={members.data ?? []}
        columns={memberColumns}
        loading={members.isLoading}
        error={members.error ? (members.error as Error).message : null}
        searchKeys={(r) => `${r.profiles?.full_name ?? ""} ${r.profiles?.email ?? ""} ${r.roles?.name ?? ""}`}
        exportName="team"
        emptyTitle="No team members"
        emptyBody="Invite colleagues and assign them a role."
      />

      {(invites.data ?? []).length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Pending invites</h2>
          <DataTable rows={invites.data ?? []} columns={inviteColumns} exportName="invites" />
        </div>
      ) : null}
    </div>
  );
}
