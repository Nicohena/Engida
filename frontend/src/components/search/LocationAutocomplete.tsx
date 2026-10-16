import React, { useState, useEffect, useRef } from "react";
import { MapPin, Search as SearchIcon, ChevronRight } from "lucide-react";

export interface LocationHierarchy {
  region?: string;
  zone?: string;
  city?: string;
  subcity?: string;
  woreda?: string;
  neighborhood?: string;
  landmark?: string;
}

export interface LocationItem {
  id: string;
  name: string;
  subtitle: string;
  hierarchy?: LocationHierarchy;
}

// Popular Ethiopian Destinations
export const POPULAR_DESTINATIONS: LocationItem[] = [
  {
    id: "addis-ababa",
    name: "Addis Ababa",
    subtitle: "Capital City · Bole, Kazanchis, Piassa, Old Airport",
    hierarchy: { city: "Addis Ababa", region: "Addis Ababa", subcity: "Bole" },
  },
  {
    id: "lalibela",
    name: "Lalibela",
    subtitle: "Amhara Region · Rock-hewn Heritage Churches",
    hierarchy: { city: "Lalibela", region: "Amhara", zone: "North Wollo" },
  },
  {
    id: "bahir-dar",
    name: "Bahir Dar",
    subtitle: "Amhara Region · Lake Tana & Blue Nile Falls",
    hierarchy: { city: "Bahir Dar", region: "Amhara", zone: "West Gojjam" },
  },
  {
    id: "gondar",
    name: "Gondar",
    subtitle: "Amhara Region · Royal Enclosure & Castles",
    hierarchy: { city: "Gondar", region: "Amhara", zone: "North Gondar" },
  },
  {
    id: "bishoftu",
    name: "Bishoftu",
    subtitle: "Oromia Region · Crater Lakes & Luxury Resorts",
    hierarchy: { city: "Bishoftu", region: "Oromia", zone: "East Shewa" },
  },
  {
    id: "hawassa",
    name: "Hawassa",
    subtitle: "Sidama Region · Lake Hawassa & Scenic Parks",
    hierarchy: { city: "Hawassa", region: "Sidama" },
  },
  {
    id: "nekemte",
    name: "Nekemte",
    subtitle: "Oromia Region · Commercial & Cultural Hub",
    hierarchy: { city: "Nekemte", region: "Oromia", zone: "East Welega" },
  },
  {
    id: "bale-mountains",
    name: "Bale Mountains",
    subtitle: "Oromia Region · National Park & Wildlife",
    hierarchy: { city: "Bale", region: "Oromia", landmark: "Bale Mountains National Park" },
  },
];

interface LocationAutocompleteProps {
  value: string;
  onChange: (locationName: string, item?: LocationItem) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function LocationAutocomplete({
  value,
  onChange,
  isOpen,
  onToggle,
  onClose,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredLocations = POPULAR_DESTINATIONS.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.hierarchy?.region?.toLowerCase().includes(q)
    );
  });

  function handleSelect(item: LocationItem) {
    onChange(item.name, item);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % filteredLocations.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + filteredLocations.length) % filteredLocations.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredLocations[highlightIndex]) {
        handleSelect(filteredLocations[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="relative w-full">
      {/* Field Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label="Where are you going?"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all cursor-pointer select-none ${
          isOpen
            ? "border-primary bg-white ring-2 ring-primary/20 shadow-md"
            : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300"
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPin size={18} />
        </div>
        <div className="flex flex-col text-left overflow-hidden">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Where</span>
          <span className="truncate text-sm font-bold text-slate-800">
            {value || "Where are you going?"}
          </span>
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          onKeyDown={handleKeyDown}
          className="absolute left-0 top-full mt-2 z-50 w-full sm:w-96 rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Where are you going?
            </h4>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <SearchIcon size={16} className="text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search city, destination or property"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightIndex(0);
                }}
                className="w-full text-sm font-medium text-slate-800 outline-none bg-transparent placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* List of items */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredLocations.length === 0 ? (
              <p className="p-4 text-center text-xs font-medium text-slate-500">
                No destinations found for &quot;{query}&quot;.
              </p>
            ) : (
              filteredLocations.map((item, idx) => {
                const isSelected = value === item.name;
                const isHighlighted = idx === highlightIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : isHighlighted
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{item.name}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    {isSelected && <ChevronRight size={16} className="text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
