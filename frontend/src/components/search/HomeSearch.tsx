import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { DateRangePicker } from "./DateRangePicker";
import { GuestsRoomsPopover, GuestsRoomsValue } from "./GuestsRoomsPopover";

type PopoverType = "location" | "dates" | "guests" | null;

export function HomeSearch() {
  const navigate = useNavigate();
  const searchBarRef = useRef<HTMLDivElement>(null);

  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const [guestsRooms, setGuestsRooms] = useState<GuestsRoomsValue>({
    rooms: 1,
    adults: 1,
    children: 0,
    childAges: [],
    parkingRequired: false,
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close active popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePopover(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleTogglePopover(type: PopoverType) {
    setErrorMessage("");
    setActivePopover((prev) => (prev === type ? null : type));
  }

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMessage("");

    // Required Field Validations
    if (!location.trim()) {
      setErrorMessage("Please select a destination.");
      setActivePopover("location");
      return;
    }

    if (!checkIn || !checkOut) {
      setErrorMessage("Please select your check-in and check-out dates.");
      setActivePopover("dates");
      return;
    }

    if (guestsRooms.adults < 1) {
      setErrorMessage("At least one adult is required.");
      setActivePopover("guests");
      return;
    }

    if (guestsRooms.rooms < 1) {
      setErrorMessage("At least one room is required.");
      setActivePopover("guests");
      return;
    }

    // Submit Loading State
    setIsSubmitting(true);

    const searchQueryObj = {
      location: location.trim(),
      checkIn,
      checkOut,
      rooms: guestsRooms.rooms,
      adults: guestsRooms.adults,
      children: guestsRooms.children,
      childAges: guestsRooms.childAges,
      parkingRequired: guestsRooms.parkingRequired,
    };

    console.log("Submitting GUZO Search Query:", searchQueryObj);

    // Build URL Parameters
    const params = new URLSearchParams();
    params.set("location", location.trim());
    params.set("city", location.trim()); // for backward compatibility with Search page
    params.set("checkIn", checkIn);
    params.set("checkOut", checkOut);
    params.set("rooms", String(guestsRooms.rooms));
    params.set("adults", String(guestsRooms.adults));
    params.set("children", String(guestsRooms.children));
    if (guestsRooms.parkingRequired) {
      params.set("parking", "true");
    }

    setTimeout(() => {
      navigate(`/search?${params.toString()}`);
      setIsSubmitting(false);
    }, 400);
  }

  return (
    <div ref={searchBarRef} className="relative w-full">
      {/* Inline Validation Warning Message */}
      {errorMessage && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-900 shadow-sm animate-in fade-in slide-in-from-bottom-1">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Search Component Bar */}
      <div className="rounded-3xl bg-white p-3 sm:p-4 shadow-2xl border border-slate-100 backdrop-blur-lg">
        {/* Desktop / Tablet Horizontal Layout */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12 lg:gap-3 items-center">
          {/* 1. Location */}
          <div className="lg:col-span-4">
            <LocationAutocomplete
              value={location}
              onChange={(val) => setLocation(val)}
              isOpen={activePopover === "location"}
              onToggle={() => handleTogglePopover("location")}
              onClose={() => setActivePopover(null)}
            />
          </div>

          {/* 2. Dates */}
          <div className="lg:col-span-3">
            <DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={(inDate, outDate) => {
                setCheckIn(inDate);
                setCheckOut(outDate);
              }}
              isOpen={activePopover === "dates"}
              onToggle={() => handleTogglePopover("dates")}
              onClose={() => setActivePopover(null)}
            />
          </div>

          {/* 3. Guests & Rooms */}
          <div className="lg:col-span-3">
            <GuestsRoomsPopover
              value={guestsRooms}
              onChange={(val) => setGuestsRooms(val)}
              isOpen={activePopover === "guests"}
              onToggle={() => handleTogglePopover("guests")}
              onClose={() => setActivePopover(null)}
            />
          </div>

          {/* 4. Search Button */}
          <div className="lg:col-span-2">
            <Button
              size="lg"
              type="button"
              disabled={isSubmitting}
              onClick={handleSearchSubmit}
              className="w-full h-[52px] rounded-2xl bg-primary text-white font-extrabold text-sm hover:bg-primary-dark shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Finding stays...</span>
                </>
              ) : (
                <>
                  <SearchIcon size={18} />
                  <span>Search</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
