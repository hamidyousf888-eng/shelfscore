import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  exportValue?: (row: T) => string | number;
  className?: string;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  searchKeys?: (row: T) => string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  pageSize?: number;
  exportName?: string;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  rows,
  columns,
  loading,
  error,
  searchKeys,
  emptyTitle = "Nothing here yet",
  emptyBody = "Records will appear here once they are created.",
  emptyAction,
  pageSize = 15,
  exportName = "export",
  toolbar,
  onRowClick,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let out = rows;
    if (query && searchKeys) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchKeys(r).toLowerCase().includes(q));
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av === bv) return 0;
          return (av > bv ? 1 : -1) * (sort.dir === "asc" ? 1 : -1);
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const exportCsv = () => {
    const head = columns.map((c) => `"${c.header}"`).join(",");
    const body = filtered
      .map((row) =>
        columns
          .map((c) => {
            const v = c.exportValue ? c.exportValue(row) : "";
            return `"${String(v ?? "").replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchKeys ? (
          <div className="relative min-w-52 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search…"
              className="pl-8"
              aria-label="Search table"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {toolbar}
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="size-4" /> Export
        </Button>
      </div>

      <div className="bg-card overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.id} className={c.className}>
                  {c.sortValue ? (
                    <button
                      className="hover:text-foreground inline-flex items-center gap-1"
                      onClick={() =>
                        setSort((prev) =>
                          prev?.id === c.id ? { id: c.id, dir: prev.dir === "asc" ? "desc" : "asc" } : { id: c.id, dir: "asc" },
                        )
                      }
                    >
                      {c.header}
                      {sort?.id === c.id ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.id}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-destructive py-10 text-center text-sm">
                  {error}
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center">
                  <p className="font-medium">{emptyTitle}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{emptyBody}</p>
                  {emptyAction ? <div className="mt-4 flex justify-center">{emptyAction}</div> : null}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row, i) => (
                <TableRow
                  key={i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((c) => (
                    <TableCell key={c.id} className={c.className}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > pageSize ? (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
