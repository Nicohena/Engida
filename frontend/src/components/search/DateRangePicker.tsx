import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "../ui/Button";

interface DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatYYYYMMDD(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  isOpen,
  onToggle,
  onClose,
}: DateRangePickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [tempCheckIn, setTempCheckIn] = useState(checkIn);
  const [tempCheckOut, setTempCheckOut] = useState(checkOut);
  const [currentViewDate, setCurrentViewDate] = useState(() => new Date());

  // Sync temp state when popover opens
  function handleToggleOpen() {
    setTempCheckIn(checkIn);
    setTempCheckOut(checkOut);
    onToggle();
  }

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  // Generate calendar days for a given month
  function generateMonthDays(y: number, m: number) {
    const firstDay = new Date(y, m, 1).getDay();
    const totalDays = new Date(y, m + 1, 0).getDate();

    const days: ({ year: number; month: number; day: number; dateStr: string; isDisabled: boolean } | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(y, m, d);
      const isDisabled = dateObj < today;
      const dateStr = formatYYYYMMDD(y, m, d);
      days.push({ year: y, month: m, day: d, dateStr, isDisabled });
    }
    return days;
  }

  const leftMonthDays = useMemo(() => generateMonthDays(year, month), [year, month]);
  const rightMonthDays = useMemo(() => {
    const nextY = month === 11 ? year + 1 : year;
    const nextM = month === 11 ? 0 : month + 1;
    return generateMonthDays(nextY, nextM);
  }, [year, month]);

  function handleDateClick(dateStr: string) {
    if (!tempCheckIn || (tempCheckIn && tempCheckOut)) {
      // Step 1: Select Check-In
      setTempCheckIn(dateStr);
      setTempCheckOut("");
    } else if (tempCheckIn && !tempCheckOut) {
      if (dateStr > tempCheckIn) {
        // Step 2: Select Check-Out
        setTempCheckOut(dateStr);
      } else {
        // If selected date is prior to checkIn, reset checkIn
        setTempCheckIn(dateStr);
        setTempCheckOut("");
      }
    }
  }

  function handleApply() {
    if (tempCheckIn && tempCheckOut) {
      onChange(tempCheckIn, tempCheckOut);
    } else if (tempCheckIn) {
      // Default checkout to +1 day if user only selected checkin
      const inDateObj = new Date(tempCheckIn + "T00:00:00");
      inDateObj.setDate(inDateObj.getDate() + 1);
      const autoOut = formatYYYYMMDD(inDateObj.getFullYear(), inDateObj.getMonth(), inDateObj.getDate());
      onChange(tempCheckIn, autoOut);
    }
    onClose();
  }

  const displayText =
    checkIn && checkOut
      ? `${formatDateDisplay(checkIn)} – ${formatDateDisplay(checkOut)}`
      : checkIn
      ? `${formatDateDisplay(checkIn)} – Select check-out`
      : "Select dates";

  return (
    <div className="relative w-full">
      {/* Field Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label="Select check-in and check-out dates"
        onClick={handleToggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggleOpen();
          }
        }}
        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all cursor-pointer select-none ${
          isOpen
            ? "border-primary bg-white ring-2 ring-primary/20 shadow-md"
            : "border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300"
        }`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Calendar size={18} />
        </div>
        <div className="flex flex-col text-left overflow-hidden">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Dates</span>
          <span className="truncate text-sm font-bold text-slate-800">{displayText}</span>
        </div>
      </div>

      {/* Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:-left-24 top-full mt-2 z-50 w-full sm:w-[620px] rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Select dates</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {!tempCheckIn
                  ? "Select check-in date"
                  : !tempCheckOut
                  ? "Now select check-out date"
                  : `${formatDateDisplay(tempCheckIn)} – ${formatDateDisplay(tempCheckOut)}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentViewDate(new Date(year, month - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentViewDate(new Date(year, month + 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Dual Months Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left Month */}
            <div>
              <p className="text-xs font-extrabold text-slate-800 text-center mb-3">
                {new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="text-[11px] font-bold text-slate-400">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {leftMonthDays.map((dayObj, i) => {
                  if (!dayObj) return <div key={`empty-left-${i}`} />;
                  const isSelected = dayObj.dateStr === tempCheckIn || dayObj.dateStr === tempCheckOut;
                  const isInRange =
                    tempCheckIn && tempCheckOut && dayObj.dateStr > tempCheckIn && dayObj.dateStr < tempCheckOut;

                  return (
                    <button
                      key={dayObj.dateStr}
                      type="button"
                      disabled={dayObj.isDisabled}
                      onClick={() => handleDateClick(dayObj.dateStr)}
                      className={`h-9 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                        dayObj.isDisabled
                          ? "text-slate-300 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary text-white shadow-md scale-105"
                          : isInRange
                          ? "bg-primary/15 text-primary rounded-none"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Month (Desktop) */}
            <div className="hidden sm:block">
              <p className="text-xs font-extrabold text-slate-800 text-center mb-3">
                {new Date(year, month + 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="text-[11px] font-bold text-slate-400">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {rightMonthDays.map((dayObj, i) => {
                  if (!dayObj) return <div key={`empty-right-${i}`} />;
                  const isSelected = dayObj.dateStr === tempCheckIn || dayObj.dateStr === tempCheckOut;
                  const isInRange =
                    tempCheckIn && tempCheckOut && dayObj.dateStr > tempCheckIn && dayObj.dateStr < tempCheckOut;

                  return (
                    <button
                      key={dayObj.dateStr}
                      type="button"
                      disabled={dayObj.isDisabled}
                      onClick={() => handleDateClick(dayObj.dateStr)}
                      className={`h-9 w-full rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                        dayObj.isDisabled
                          ? "text-slate-300 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary text-white shadow-md scale-105"
                          : isInRange
                          ? "bg-primary/15 text-primary rounded-none"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setTempCheckIn("");
                setTempCheckOut("");
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Clear dates
            </button>
            <Button
              size="sm"
              onClick={handleApply}
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
