"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_FILTERS,
  filterPlays,
  stylePoint,
  type Filters,
  type Play,
} from "@/lib/analytics";
import Card from "@/components/Card";
import FilterBar from "@/components/FilterBar";
import Quadrant from "@/components/charts/Quadrant";

export default function StyleView({
  plays,
  categories,
}: {
  plays: Play[];
  categories: string[];
}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), []);

  const fPlays = useMemo(() => filterPlays(plays, filters, nowSec), [plays, filters, nowSec]);
  const point = useMemo(() => stylePoint(fPlays, filters, nowSec), [fPlays, filters, nowSec]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
      <div className="order-2 space-y-4 lg:order-1">
        <Card
          title="Trading style"
          subtitle="Average probability at entry (risk appetite) vs. plays per week (touch)"
        >
          <Quadrant point={point} />
        </Card>
      </div>

      <aside className="order-1 lg:order-2">
        <FilterBar categories={categories} filters={filters} onChange={setFilters} />
      </aside>
    </div>
  );
}
