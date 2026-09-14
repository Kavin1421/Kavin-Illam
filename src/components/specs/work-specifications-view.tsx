"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MATERIAL_SPEC_ROWS,
  WORK_SPEC_META,
  WORK_SPEC_SECTIONS,
} from "@/content/work-specifications";
import { cn } from "@/lib/utils";

export function WorkSpecificationsView() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(WORK_SPEC_SECTIONS[0]?.id ?? "");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORK_SPEC_SECTIONS;
    return WORK_SPEC_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.toLowerCase().includes(q) ||
          section.title.toLowerCase().includes(q),
      ),
    })).filter(
      (section) =>
        section.items.length > 0 || section.title.toLowerCase().includes(q),
    );
  }, [query]);

  const filteredMaterials = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MATERIAL_SPEC_ROWS;
    return MATERIAL_SPEC_ROWS.filter(
      (row) =>
        row.description.toLowerCase().includes(q) ||
        row.brand.toLowerCase().includes(q) ||
        row.rate.toLowerCase().includes(q),
    );
  }, [query]);

  const matchCount =
    filteredSections.reduce((sum, s) => sum + s.items.length, 0) +
    filteredMaterials.length;

  useEffect(() => {
    const nodes = WORK_SPEC_SECTIONS.map((section) =>
      document.getElementById(section.id),
    ).filter((node): node is HTMLElement => Boolean(node));
    const materials = document.getElementById("materials");
    if (materials) nodes.push(materials);

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) setActiveId(top);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function onPrint() {
    toast.message("Opening print dialog…", {
      description: "Use Save as PDF for a clean white document.",
    });
    window.setTimeout(() => window.print(), 120);
  }

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="specs-print-root animate-page-in space-y-8">
      <header className="space-y-4 border-b border-white/10 pb-8">
        <p className="text-[11px] font-medium tracking-[0.16em] text-mint/80 uppercase">
          Build document · Civil works package
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
              {WORK_SPEC_META.title}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {WORK_SPEC_META.subtitle}. Scope, finishes, and brand allowances
              for the build — exclusions noted at the end.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" data-print-hide>
            <Button asChild>
              <a href="/docs/work-specifications-m1.pdf" download>
                Download PDF
              </a>
            </Button>
            <Button type="button" variant="outline" onClick={onPrint}>
              Print
            </Button>
            <Button type="button" variant="ghost" onClick={onCopyLink}>
              Share
            </Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-4">
          <MetaCell label="Document" value="Civil works package" />
          <MetaCell label="Version" value="1.0" />
          <MetaCell label="Status" value="Active" />
          <MetaCell label="Source" value="Original PDF" />
        </div>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside
          className="hidden w-52 shrink-0 lg:block"
          data-print-hide
          aria-label="Document outline"
        >
          <div className="sticky top-24 space-y-1">
            <p className="mb-3 text-[10px] tracking-[0.14em] text-white/45 uppercase">
              Outline
            </p>
            {WORK_SPEC_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  "block rounded-lg px-2.5 py-1.5 text-xs transition-ki-fast",
                  activeId === section.id
                    ? "bg-cta/15 text-white"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <span className="font-mono text-[10px] text-mint/70">
                  {section.number}
                </span>{" "}
                {section.title}
              </a>
            ))}
            <a
              href="#materials"
              className={cn(
                "block rounded-lg px-2.5 py-1.5 text-xs transition-ki-fast",
                activeId === "materials"
                  ? "bg-cta/15 text-white"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-white",
              )}
            >
              Materials
            </a>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <div className="space-y-3" data-print-hide>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search specifications…"
              aria-label="Search specifications"
            />
            {query.trim() ? (
              <p className="text-muted-foreground text-xs">
                {matchCount} match{matchCount === 1 ? "" : "es"}
              </p>
            ) : null}

            <nav
              aria-label="Specification sections"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {WORK_SPEC_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-ki-fast",
                    activeId === section.id
                      ? "border-cta/40 bg-cta/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/75 hover:border-brand/40 hover:text-white",
                  )}
                >
                  {section.number} {section.title}
                </a>
              ))}
              <a
                href="#materials"
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-ki-fast",
                  activeId === "materials"
                    ? "border-cta/40 bg-cta/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/75 hover:border-brand/40 hover:text-white",
                )}
              >
                Materials
              </a>
            </nav>
          </div>

          <div className="mx-auto max-w-[920px] space-y-8">
            {filteredSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-brand/80">
                    {section.number}
                  </span>
                  <h2 className="font-heading text-xl tracking-tight">
                    {section.title}
                  </h2>
                </div>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="border-l-2 border-cta/35 pl-4 text-sm leading-relaxed text-muted-white"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section
              id="materials"
              className="scroll-mt-28 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-brand/80">11</span>
                <h2 className="font-heading text-xl tracking-tight">
                  Material specifications
                </h2>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs tracking-wide text-white/70 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Brand</th>
                      <th className="px-4 py-3 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map((row) => (
                      <tr
                        key={row.sno}
                        className="border-t border-white/10 text-muted-foreground"
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {row.sno}
                        </td>
                        <td className="px-4 py-3 text-white/90">
                          {row.description}
                        </td>
                        <td className="px-4 py-3">{row.brand}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.rate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
              <p className="text-sm text-amber-100/90">{WORK_SPEC_META.note}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                Extra items (rock drilling, RCC OHT, gate, compound wall,
                structure lift above 2′6″) are charged on mutual understanding
                or pro-rata.
              </p>
            </aside>

            <div className="border-t border-white/10 pt-4" data-print-hide>
              <p className="text-muted-foreground text-xs">
                Related:{" "}
                <a
                  href="/docs/work-specifications-m1.pdf"
                  className="text-brand underline-offset-4 hover:underline"
                >
                  Original civil works PDF
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.14em] text-white/45 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}
