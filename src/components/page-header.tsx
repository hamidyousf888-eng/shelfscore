import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb?.length ? (
          <nav aria-label="Breadcrumb" className="text-muted-foreground mb-1 flex items-center gap-1 text-xs">
            {breadcrumb.map((b, i) => (
              <span key={b.label} className="flex items-center gap-1">
                {b.to ? (
                  <Link to={b.to} className="hover:text-foreground">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
                {i < breadcrumb.length - 1 ? <span>/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
