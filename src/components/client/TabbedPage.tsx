"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export interface PageTab { key: string; label: string; render: () => React.ReactNode }

/**
 * One page with tabs, the tab kept in ?tab= so links and the back button work.
 * Used where the client nav merges related pages (Heart & vitals, Protocol).
 */
function Tabs({ title, blurb, tabs }: { title: string; blurb?: string; tabs: PageTab[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = tabs.find((t) => t.key === params.get("tab")) ?? tabs[0];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">{title}</h1>
        {blurb && <p className="text-sm text-kairos-silver-dark mt-1">{blurb}</p>}
      </div>
      <div role="tablist" aria-label={title} className="flex gap-1 border-b border-kairos-border overflow-x-auto">
        {tabs.map((t) => {
          const on = t.key === active.key;
          return (
            <Link
              key={t.key}
              role="tab"
              aria-selected={on}
              href={`${pathname}?tab=${t.key}`}
              scroll={false}
              className={`px-4 py-2 text-sm font-heading font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                on ? "border-kairos-gold text-white" : "border-transparent text-kairos-silver-dark hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <div role="tabpanel">{active.render()}</div>
    </div>
  );
}

export function TabbedPage(props: { title: string; blurb?: string; tabs: PageTab[] }) {
  return (
    <Suspense fallback={null}>
      <Tabs {...props} />
    </Suspense>
  );
}
