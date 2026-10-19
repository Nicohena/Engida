import React from "react";
import { Users, Minus, Plus, Car, Check } from "lucide-react";
import { Button } from "../ui/Button";

export interface GuestsRoomsValue {
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
  parkingRequired: boolean;
}

interface GuestsRoomsPopoverProps {
  value: GuestsRoomsValue;
  onChange: (val: GuestsRoomsValue) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function formatGuestsRoomsSummary(val: GuestsRoomsValue): string {
  const roomText = `${val.rooms} ${val.rooms === 1 ? "room" : "rooms"}`;
  const adultText = `${val.adults} ${val.adults === 1 ? "adult" : "adults"}`;
  const childText = `${val.children} ${val.children === 1 ? "child" : "children"}`;
  const parkingText = val.parkingRequired ? " · parking" : "";

  return `${roomText} · ${adultText} · ${childText}${parkingText}`;
}

export function GuestsRoomsPopover({
  value,
  onChange,
  isOpen,
  onToggle,
  onClose,
}: GuestsRoomsPopoverProps) {
  function updateRooms(delta: number) {
    const nextRooms = Math.max(1, value.rooms + delta);
    onChange({ ...value, rooms: nextRooms });
  }

  function updateAdults(delta: number) {
    const nextAdults = Math.max(1, value.adults + delta);
    onChange({ ...value, adults: nextAdults });
  }

  function updateChildren(delta: number) {
    const nextChildren = Math.max(0, value.children + delta);
    let nextAges = [...value.childAges];

    if (nextChildren > nextAges.length) {
      // Add default age 5 for new child
      while (nextAges.length < nextChildren) {
        nextAges.push(5);
      }
    } else if (nextChildren < nextAges.length) {
      nextAges = nextAges.slice(0, nextChildren);
    }

    onChange({ ...value, children: nextChildren, childAges: nextAges });
  }

  function handleChildAgeChange(index: number, age: number) {
    const nextAges = [...value.childAges];
    nextAges[index] = age;
    onChange({ ...value, childAges: nextAges });
  }

  function handleParkingToggle(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...value, parkingRequired: e.target.checked });
  }

  const summary = formatGuestsRoomsSummary(value);

  return (
    <div className="relative w-full">
      {/* Field Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label="Guests and rooms"
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
          <Users size={18} />
        </div>
        <div className="flex flex-col text-left overflow-hidden">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Guests & rooms</span>
          <span className="truncate text-sm font-bold text-slate-800">{summary}</span>
        </div>
      </div>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-full sm:w-96 rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <h4 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2.5 mb-4">
            Guests & rooms
          </h4>

          <div className="space-y-4">
            {/* Rooms */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Rooms</p>
                <p className="text-[11px] text-slate-500 font-medium">Number of rooms</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease rooms"
                  disabled={value.rooms <= 1}
                  onClick={() => updateRooms(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus size={14} />
                </button>
                <span className="w-5 text-center text-sm font-bold text-slate-800">{value.rooms}</span>
                <button
                  type="button"
                  aria-label="Increase rooms"
                  onClick={() => updateRooms(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Adults */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Adults</p>
                <p className="text-[11px] text-slate-500 font-medium">Ages 13 or above</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease adults"
                  disabled={value.adults <= 1}
                  onClick={() => updateAdults(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus size={14} />
                </button>
                <span className="w-5 text-center text-sm font-bold text-slate-800">{value.adults}</span>
                <button
                  type="button"
                  aria-label="Increase adults"
                  onClick={() => updateAdults(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Children */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Children</p>
                <p className="text-[11px] text-slate-500 font-medium">Ages 0–12</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease children"
                  disabled={value.children <= 0}
                  onClick={() => updateChildren(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus size={14} />
                </button>
                <span className="w-5 text-center text-sm font-bold text-slate-800">{value.children}</span>
                <button
                  type="button"
                  aria-label="Increase children"
                  onClick={() => updateChildren(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Dynamic Child Age Selectors */}
            {value.children > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-700">Child ages</p>
                <div className="grid grid-cols-2 gap-2">
                  {value.childAges.map((age, idx) => (
                    <div key={`child-age-${idx}`} className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-500">Child {idx + 1} age</label>
                      <select
                        aria-label={`Child ${idx + 1} age`}
                        value={age}
                        onChange={(e) => handleChildAgeChange(idx, Number(e.target.value))}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-primary focus:bg-white"
                      >
                        {Array.from({ length: 13 }, (_, i) => i).map((a) => (
                          <option key={a} value={a}>
                            {a} {a === 1 ? "year old" : "years old"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parking Option Checkbox */}
            <div className="pt-3 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={value.parkingRequired}
                  onChange={handleParkingToggle}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
                <Car size={16} className="text-primary shrink-0" />
                <span>I need parking</span>
              </label>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
            <Button
              size="sm"
              onClick={onClose}
              className="rounded-xl bg-primary text-white font-bold px-5 py-2 hover:bg-primary-dark"
            >
              <Check size={14} className="mr-1" /> Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
