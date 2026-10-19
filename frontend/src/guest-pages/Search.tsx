import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SlidersHorizontal, ShieldCheck, Car, X, Calendar, Users, MapPin, Sparkles } from "lucide-react";
import { PropertyCard } from "../components/PropertyCard";
import { Card } from "../components/ui/Card";
import { api } from "../lib/api";
import type { Property } from "../types";

// Handpicked Addis Ababa fallback stays (shown in highlight section)
const HANDPICKED_ADDIS: Property[] = [
  {
    id: 201,
    title: "Skylight Luxury Hotel & Suites",
    description: "5-star luxury accommodation in Bole, Addis Ababa, minutes from Bole International Airport.",
    city: "Addis Ababa",
    region: "Bole",
    address: "Bole Road, Near Airport",
    latitude: 8.9806,
    longitude: 38.7972,
    price: 4500,
    rating: 0,
    trustScore: 96,
    propertyType: "HOTEL",
    published: true,
    images: [{ id: 1, imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" }],
    amenities: [{ amenity: { id: 1, name: "Parking", icon: "car" } }],
  },
  {
    id: 202,
    title: "Kazanchis Executive Residence",
    description: "Modern serviced apartment in Kazanchis financial district, Addis Ababa.",
    city: "Addis Ababa",
    region: "Kazanchis",
    address: "UN Avenue, Kazanchis",
    latitude: 9.018,
    longitude: 38.765,
    price: 3200,
    rating: 0,
    trustScore: 91,
    propertyType: "APARTMENT",
    published: true,
    images: [{ id: 2, imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80" }],
    amenities: [{ amenity: { id: 1, name: "Parking", icon: "car" } }],
  },
  {
    id: 203,
    title: "Entoto Mountain Lodge & Spa",
    description: "Panoramic eco-lodge overlooking the Addis Ababa skyline and eucalyptus hills.",
    city: "Addis Ababa",
    region: "Entoto",
    address: "Entoto Park Summit",
    latitude: 9.085,
    longitude: 38.74,
    price: 4200,
    rating: 0,
    trustScore: 94,
    propertyType: "LODGE",
    published: true,
    images: [{ id: 3, imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80" }],
    amenities: [],
  },
  {
    id: 204,
    title: "Old Airport Garden Guesthouse",
    description: "Quiet, charming guest accommodation in Old Airport residential neighborhood, Addis Ababa.",
    city: "Addis Ababa",
    region: "Old Airport",
    address: "South Africa Street",
    latitude: 8.992,
    longitude: 38.748,
    price: 2100,
    rating: 0,
    trustScore: 88,
    propertyType: "GUESTHOUSE",
    published: true,
    images: [{ id: 4, imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" }],
    amenities: [],
  },
];

const CITIES = ["Addis Ababa", "Lalibela", "Bahir Dar", "Gondar", "Hawassa", "Bishoftu", "Mekelle"];
const PROPERTY_TYPES = ["HOTEL", "APARTMENT", "GUESTHOUSE", "LODGE", "RESORT"];
const AMENITIES = ["WiFi", "Parking", "Breakfast", "Pool", "Kitchen", "Air Conditioning", "TV"];

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse location/city from searchParams
  const initialLocation = searchParams.get("location") || searchParams.get("city") || "";
  const initialParking = searchParams.get("parking") === "true";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const rooms = searchParams.get("rooms") || "";
  const adults = searchParams.get("adults") || "";
  const children = searchParams.get("children") || "";

  const [city, setCity] = useState(initialLocation);
  const [minPrice, setMinPrice] = useState(300);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [types, setTypes] = useState<string[]>(searchParams.get("propertyType") ? [searchParams.get("propertyType")!] : []);
  const [amenities, setAmenities] = useState<string[]>(initialParking ? ["Parking"] : []);
  const [parkingRequired, setParkingRequired] = useState(initialParking);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("recommended");

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function handleRemoveParkingFilter() {
    setParkingRequired(false);
    setAmenities((prev) => prev.filter((a) => a.toLowerCase() !== "parking"));
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("parking");
    setSearchParams(nextParams);
  }

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {
      minPrice: String(minPrice),
      maxPrice: String(maxPrice),
    };

    if (city) params.city = city;
    if (types.length === 1) params.propertyType = types[0];

    const currentAmenities = [...amenities];
    if (parkingRequired && !currentAmenities.includes("Parking")) {
      currentAmenities.push("Parking");
    }

    if (currentAmenities.length) params.amenities = currentAmenities.join(",");
    if (minRating) params.rating = String(minRating);
    if (verifiedOnly) params.verifiedOnly = "true";
    if (sort === "price_low") params.sort = "price_asc";
    if (sort === "price_high") params.sort = "price_desc";
    if (sort === "rating") params.sort = "rating";

    api
      .searchProperties(params)
      .then((data) => {
        let filtered = data;
        // Filter by property types if multiple
        if (types.length > 1) {
          filtered = filtered.filter((p: Property) => types.includes(p.propertyType));
        }
        // Filter by parking if required
        if (parkingRequired) {
          filtered = filtered.filter((p: Property) => {
            if (!p.amenities) return true;
            return p.amenities.some((a) => a.amenity?.name?.toLowerCase() === "parking");
          });
        }
        setProperties(filtered);
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [city, minPrice, maxPrice, types, amenities, parkingRequired, minRating, verifiedOnly, sort]);

  // Is user searching specifically for Addis Ababa?
  const isAddisSearch = useMemo(() => {
    const q = city.toLowerCase();
    return q.includes("addis") || q.includes("ababa");
  }, [city]);

  // Handpicked stays to show at top when Addis Ababa is selected
  const handpickedStays = useMemo(() => {
    if (!isAddisSearch) return [];
    const fromResults = properties.filter(
      (p) => p.city.toLowerCase().includes("addis") || p.city.toLowerCase().includes("ababa")
    );
    return fromResults.length > 0 ? fromResults.slice(0, 4) : HANDPICKED_ADDIS;
  }, [isAddisSearch, properties]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
      {/* Search Header Criteria Context */}
      {(city || checkIn || rooms || adults || parkingRequired) && (
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
            {city && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 font-bold">
                <MapPin size={13} /> {city}
              </span>
            )}
            {checkIn && checkOut && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 px-3 py-1">
                <Calendar size={13} /> {checkIn} to {checkOut}
              </span>
            )}
            {(rooms || adults) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-800 px-3 py-1">
                <Users size={13} /> {rooms ? `${rooms} room(s)` : ""} {adults ? `· ${adults} adult(s)` : ""}{" "}
                {children ? `· ${children} child` : ""}
              </span>
            )}
            {parkingRequired && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 font-bold">
                <Car size={13} className="text-emerald-600" /> Parking required
                <button
                  type="button"
                  onClick={handleRemoveParkingFilter}
                  aria-label="Remove parking filter"
                  className="ml-1 rounded-full p-0.5 hover:bg-emerald-200 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* =================================================
          HANDPICKED STAYS IN ADDIS ABABA
          Shown at the top of results when city = Addis Ababa
          ================================================= */}
      {isAddisSearch && handpickedStays.length > 0 && (
        <section className="mb-10">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 mb-2">
                <Sparkles size={12} /> Handpicked Stays
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Recommended stays in Addis Ababa
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Comfortable, verified places selected for your Ethiopian journey.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {handpickedStays.map((p) => (
              <PropertyCard key={`handpicked-${p.id}`} property={p} hideVerifiedBadge />
            ))}
          </div>

          {/* Divider */}
          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-slate-700">All results for Addis Ababa</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters sidebar */}
        <Card className="self-stretch p-5 flex flex-col">
          <div className="mb-4 flex items-center gap-2 text-slate-900">
            <SlidersHorizontal size={18} />
            <h2 className="font-bold">Filters</h2>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Location</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">All cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-600">
              Price Range: ETB {minPrice.toLocaleString()} – {maxPrice.toLocaleString()}
            </label>
            <input
              type="range"
              min={300}
              max={10000}
              step={100}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="mb-5">
            <p className="mb-1.5 text-sm font-medium text-slate-600">Property Type</p>
            <div className="space-y-1.5">
              {PROPERTY_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={types.includes(t)}
                    onChange={() => toggle(types, setTypes, t)}
                  />
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-1.5 text-sm font-medium text-slate-600">Amenities</p>
            <div className="space-y-1.5">
              {AMENITIES.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={amenities.includes(a)}
                    onChange={() => {
                      if (a === "Parking") setParkingRequired(!parkingRequired);
                      toggle(amenities, setAmenities, a);
                    }}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="mb-1.5 text-sm font-medium text-slate-600">Rating</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="accent-primary"
                checked={minRating === 4}
                onChange={() => setMinRating(minRating === 4 ? null : 4)}
              />
              4★ and above
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-600">Trust</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="accent-primary"
                checked={verifiedOnly}
                onChange={() => setVerifiedOnly((v) => !v)}
              />
              <ShieldCheck size={14} className="text-primary" /> Verified properties only
            </label>
          </div>
        </Card>

        {/* Results */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {loading ? "Searching…" : `${properties.length} properties found`}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="recommended">Most Popular</option>
              <option value="price_low">Lowest Price</option>
              <option value="price_high">Highest Price</option>
              <option value="rating">Highest Rating</option>
            </select>
          </div>

          {!loading && properties.length === 0 && (
            <Card className="p-10 text-center text-slate-500">
              No properties match your filters. Try adjusting them.
            </Card>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} hideVerifiedBadge />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
