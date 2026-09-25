import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit-log")({
  component: AuditLogPage,
});

type AuditRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_email: string | null;
  created_at: string;
  metadata: unknown;
};

function AuditLogPage() {
  const tenant = useTenant();
  const companyId = tenant.company?.id ?? null;

  const logs = useQuery({
    enabled: !!companyId,
    queryKey: ["audit", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity_type, entity_id, actor_email, created_at, metadata")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const columns: Column<AuditRow>[] = [
    { id: "when", header: "When", cell: (r) => formatDateTime(r.created_at), sortValue: (r) => r.created_at, exportValue: (r) => r.created_at },
    { id: "action", header: "Action", cell: (r) => <Badge variant="secondary">{r.action}</Badge>, exportValue: (r) => r.action },
    { id: "entity", header: "Entity", cell: (r) => r.entity_type ?? "—", exportValue: (r) => r.entity_type ?? "" },
    { id: "actor", header: "Actor", cell: (r) => r.actor_email ?? "system", exportValue: (r) => r.actor_email ?? "system" },
    { id: "id", header: "Record", cell: (r) => <span className="numeric text-xs">{r.entity_id?.slice(0, 8) ?? "—"}</span>, exportValue: (r) => r.entity_id ?? "" },
  ];

  if (!tenant.can("audit.read")) {
    return (
      <div>
        <PageHeader title="Audit log" />
        <p className="text-muted-foreground text-sm">You do not have permission to view the audit log.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Immutable record of sensitive actions. Entries cannot be edited or deleted."
        breadcrumb={[{ label: "Governance" }, { label: "Audit log" }]}
      />
      <DataTable
        rows={logs.data ?? []}
        columns={columns}
        loading={logs.isLoading}
        error={logs.error ? (logs.error as Error).message : null}
        searchKeys={(r) => `${r.action} ${r.entity_type ?? ""} ${r.actor_email ?? ""}`}
        exportName="audit-log"
        emptyTitle="No audit entries"
        emptyBody="Sensitive actions such as approvals, overrides and settings changes are recorded here."
      />
    </div>
  );
}
