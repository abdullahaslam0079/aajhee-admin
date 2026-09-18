"use client";

import { useEffect, useState } from "react";
import { useDebounced } from "@/lib/hooks";
import { searchAddresses, type AddressSuggestion } from "@/lib/geocode";
import { useI18n } from "@/lib/i18n";
import { inputClass } from "./ui";

export function AddressSearch({
  onPick,
}: {
  onPick: (suggestion: AddressSuggestion) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(query, 400);

  useEffect(() => {
    if (debounced.trim().length < 5) return;
    let cancelled = false;
    searchAddresses(debounced)
      .then((results) => {
        if (cancelled) return;
        setHits(results);
        setOpen(true);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);
  const suggestions = debounced.trim().length < 5 ? [] : hits;

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("branches.address_search_hint")}
        onFocus={() => suggestions.length && setOpen(true)}
      />
      {open && suggestions.length ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-surface shadow-card">
          {suggestions.map((hit) => (
            <li key={hit.display}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-paper"
                onClick={() => {
                  onPick(hit);
                  setQuery(hit.display);
                  setOpen(false);
                }}
              >
                {hit.display}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
