"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "@/components/Icons";
import { bodyPartLabel } from "@/lib/bodyParts";
import type { Place } from "@/lib/exercises";

export type Card = { id: string; name: string; bodyPart: string; target: string; equipment: string; image: string; place: Place };

const PAGE = 48;

export default function ExerciseLibrary({ items }: { items: Card[] }) {
  const [place, setPlace] = useState<Place>("home");
  const [query, setQuery] = useState("");
  const [part, setPart] = useState("all");
  const [shown, setShown] = useState(PAGE);

  const inPlace = useMemo(() => items.filter((e) => e.place === place), [items, place]);
  const parts = useMemo(
    () => ["all", ...[...new Set(inPlace.map((e) => e.bodyPart))].sort((a, b) => bodyPartLabel(a).localeCompare(bodyPartLabel(b)))],
    [inPlace],
  );
  const label = (p: string) => (p === "all" ? "All muscles" : bodyPartLabel(p));
  const q = query.trim().toLowerCase();
  const matches = inPlace.filter(
    (e) =>
      (part === "all" || e.bodyPart === part) &&
      (!q || `${e.name} ${e.target} ${e.equipment} ${bodyPartLabel(e.bodyPart)}`.toLowerCase().includes(q)),
  );

  return (
    <section>
      <div className="tabs" role="group" aria-label="Where you train">
        {(["home", "gym"] as const).map((p) => (
          <button
            key={p}
            aria-pressed={p === place}
            onClick={() => {
              setPlace(p);
              setPart("all");
              setShown(PAGE);
            }}
          >
            {p === "home" ? "Home" : "Gym"}
            <span className="tab-word"> workouts</span>
            <span className="tab-count">{items.filter((e) => e.place === p).length}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <span className="srOnly">Search exercises</span>
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
          />
        </label>
        {/* phones: a compact dropdown sits on the same line as search; wider screens get chips */}
        <label className="part-select">
          <span className="srOnly">Filter by muscle group</span>
          <select
            value={part}
            onChange={(e) => {
              setPart(e.target.value);
              setShown(PAGE);
            }}
          >
            {parts.map((p) => (
              <option key={p} value={p}>
                {label(p)}
              </option>
            ))}
          </select>
          <span className="select-chevron" aria-hidden="true">
            <Icon name="chevron" size={16} />
          </span>
        </label>
        <div className="chips" role="group" aria-label="Filter by muscle group">
          {parts.map((p) => (
            <button
              key={p}
              aria-pressed={p === part}
              onClick={() => {
                setPart(p);
                setShown(PAGE);
              }}
            >
              {label(p)}
            </button>
          ))}
        </div>
      </div>

      <p className="count" aria-live="polite">
        {matches.length} exercises
      </p>
      <ul className="grid">
        {matches.slice(0, shown).map((e) => (
          <li key={e.id}>
            <Link href={`/exercises/${e.id}`} className="card">
              <Image src={e.image} alt="" width={180} height={180} unoptimized />
              <span className="card-name">{e.name}</span>
              <span className="card-meta">{e.target}</span>
              <span className="card-tag">{e.equipment}</span>
            </Link>
          </li>
        ))}
      </ul>
      {matches.length === 0 && (
        <div className="empty">
          <p>No exercises match {q ? `"${query.trim()}"` : "this filter"}.</p>
          <button
            className="secondary"
            onClick={() => {
              setQuery("");
              setPart("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {shown < matches.length && (
        <button className="more" onClick={() => setShown((n) => n + PAGE)}>
          Show more
        </button>
      )}
    </section>
  );
}
