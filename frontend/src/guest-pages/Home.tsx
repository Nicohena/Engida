import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Home as HomeIcon,
  Hotel,
  Trees,
  Castle,
  ShieldCheck,
  Lock,
  Banknote,
  Compass,
  Sparkles,
  ArrowRight,
  Building
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { PropertyCard } from "../components/PropertyCard";
import { HomeSearch } from "../components/search/HomeSearch";
import { api } from "../lib/api";
import type { Property } from "../types";

// Quick Property Categories
const CATEGORIES = [
  { label: "Hotels", icon: Hotel, type: "HOTEL" },
  { label: "Guesthouses", icon: HomeIcon, type: "GUESTHOUSE" },
  { label: "Apartments", icon: Building2, type: "APARTMENT" },
  { label: "Lodges", icon: Trees, type: "LODGE" },
  { label: "Villas", icon: Building, type: "APARTMENT" },
  { label: "Resorts", icon: Castle, type: "RESORT" },
];

// Featured Ethiopian & Addis Ababa Destinations
const DESTINATIONS = [
  {
    name: "Addis Ababa",
    subtext: "Discover hotels, luxury apartments & guesthouses in Bole, Kazanchis, & Old Airport.",
    img: "/images/destinations/addis_ababa.png",
    badge: "Capital & Hub",
  },
  {
    name: "Lalibela",
    subtext: "Stay close to Ethiopia's remarkable rock-hewn UNESCO heritage churches.",
    img: "/images/destinations/lalibela.png",
    badge: "Historic Rock Churches",
  },
  {
    name: "Bahir Dar",
    subtext: "Enjoy Lake Tana, Blue Nile Falls, and relaxing lakeside stays.",
    img: "/images/destinations/bahir_dar.png",
    badge: "Lake Tana & Falls",
  },
  {
    name: "Gondar",
    subtext: "Explore royal history, ancient castles, and rich Ethiopian culture.",
    img: "/images/destinations/gondar.png",
    badge: "Royal Castles",
  },
  {
    name: "Hawassa",
    subtext: "Enjoy peaceful rift-valley lake accommodation and weekend getaways.",
    img: "/images/destinations/hawassa.png",
    badge: "Resort City",
  },
  {
    name: "Bishoftu",
    subtext: "Discover beautiful crater lakes and luxury resort stays just outside Addis.",
    img: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80",
    badge: "Crater Lakes",
  },
];

// Realistic Fallback Addis Ababa & Ethiopia Stays (if backend response is partial)
const MOCK_PROPERTIES: Property[] = [
  {
    id: 101,
    title: "Skylight Luxury Hotel & Suites",
    description: "5-star luxury accommodation in Bole, Addis Ababa, minutes from Bole International Airport.",
    city: "Addis Ababa",
    region: "Bole",
    address: "Bole Road, Near Airport",
    latitude: 8.9806,
    longitude: 38.7972,
    price: 4500,
    rating: 4.9,
    trustScore: 96,
    propertyType: "HOTEL",
    published: true,
    images: [{ id: 1, imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" }],
    amenities: [{ amenity: { id: 1, name: "Parking", icon: "car" } }],
  },
  {
    id: 102,
    title: "Kazanchis Executive Residence",
    description: "Modern serviced apartment in Kazanchis financial district, Addis Ababa.",
    city: "Addis Ababa",
    region: "Kazanchis",
    address: "UN Avenue, Kazanchis",
    latitude: 9.018,
    longitude: 38.765,
    price: 3200,
    rating: 4.8,
    trustScore: 91,
    propertyType: "APARTMENT",
    published: true,
    images: [{ id: 2, imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80" }],
    amenities: [{ amenity: { id: 1, name: "Parking", icon: "car" } }],
  },
  {
    id: 103,
    title: "Entoto Mountain Lodge & Spa",
    description: "Panoramic eco-lodge overlooking the Addis Ababa skyline and eucalyptus hills.",
    city: "Addis Ababa",
    region: "Entoto",
    address: "Entoto Park Summit",
    latitude: 9.085,
    longitude: 38.74,
    price: 4200,
    rating: 4.9,
    trustScore: 94,
    propertyType: "LODGE",
    published: true,
    images: [{ id: 3, imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80" }],
    amenities: [{ amenity: { id: 1, name: "Parking", icon: "car" } }],
  },
  {
    id: 104,
    title: "Old Airport Garden Guesthouse",
    description: "Quiet, charming guest accommodation in Old Airport residential neighborhood, Addis Ababa.",
    city: "Addis Ababa",
    region: "Old Airport",
    address: "South Africa Street",
    latitude: 8.992,
    longitude: 38.748,
    price: 2100,
    rating: 4.7,
    trustScore: 88,
    propertyType: "GUESTHOUSE",
    published: true,
    images: [{ id: 4, imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" }],
    amenities: [],
  },
];

// Special Deals Data
const SPECIAL_DEALS = [
  {
    property: MOCK_PROPERTIES[0],
    dealTag: "Weekend Special",
    discount: "20% OFF",
    originalPrice: 5625,
  },
  {
    property: MOCK_PROPERTIES[1],
    dealTag: "Addis Executive Pass",
    discount: "15% OFF",
    originalPrice: 3765,
  },
  {
    property: MOCK_PROPERTIES[2],
    dealTag: "Mountain Retreat",
    discount: "25% OFF",
    originalPrice: 5600,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProperties()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProperties(data);
        } else {
          setProperties(MOCK_PROPERTIES);
        }
      })
      .catch(() => {
        setProperties(MOCK_PROPERTIES);
      })
      .finally(() => setLoading(false));
  }, []);

  const addisProperties = properties.filter(
    (p) => p.city.toLowerCase().includes("addis") || p.city.toLowerCase().includes("ababa")
  );
  const displayedAddisStays = addisProperties.length > 0 ? addisProperties : properties.slice(0, 4);
  // Note: displayedAddisStays is still used in the Personalized Recommendations section below.

  return (
    <div className="min-h-screen bg-surface font-sans text-slate-900 pb-16">
      {/* 
        ==================================================
        2. HERO SECTION
        ==================================================
      */}
      <section className="relative min-h-[520px] flex items-center justify-center overflow-hidden bg-slate-950 text-white">
        {/* Background Image with Dark Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-black/40" />

        {/* Content Container */}
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center sm:text-left z-10 w-full mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-md border border-white/20 mb-6 shadow-sm">
            <Sparkles size={14} className="text-accent inline-block" />
            <span>Book with confidence. Discover with GUZO.</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-tight drop-shadow-md">
            Find Your Perfect Stay in <span className="text-amber-400">Addis Ababa</span> & Ethiopia
          </h1>

          <p className="mt-4 max-w-2xl text-base sm:text-lg text-slate-200 font-normal leading-relaxed drop-shadow">
            Discover verified hotels, luxury apartments, guesthouses, lodges and unique stays in Addis Ababa and across Ethiopia.
          </p>
        </div>
      </section>

      {/* 
        ==================================================
        3. MODULAR GUZO HOME SEARCH COMPONENT (Overlapping Hero)
        ==================================================
      */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-30 -mt-24 sm:-mt-20">
        <HomeSearch />
      </div>

      {/* 
        ==================================================
        4. QUICK PROPERTY TYPES
        ==================================================
      */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Find a stay that fits you</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Explore accommodation types tailored for your journey</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map(({ label, icon: Icon, type }) => (
            <button
              key={label}
              onClick={() => navigate(`/search?propertyType=${type}`)}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon size={24} />
              </div>
              <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 
        ==================================================
        5. EXPLORE ETHIOPIA & ADDIS ABABA SECTION
        ==================================================
      */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="text-xs font-extrabold text-primary uppercase tracking-widest">Destinations</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Explore Addis Ababa & Beyond</h2>
          <p className="text-sm text-slate-600 font-medium mt-1">Find your next stay in Ethiopia&apos;s most loved destinations.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((d) => (
            <button
              key={d.name}
              onClick={() => navigate(`/search?location=${encodeURIComponent(d.name)}&city=${encodeURIComponent(d.name)}`)}
              className="group relative flex flex-col justify-end overflow-hidden rounded-3xl h-72 shadow-md border border-slate-100 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <img
                src={d.img}
                alt={d.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <div className="relative p-6 z-10">
                <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/30 mb-2">
                  {d.badge}
                </span>
                <h3 className="text-2xl font-extrabold text-white group-hover:text-amber-300 transition-colors">{d.name}</h3>
                <p className="text-xs text-slate-200 font-normal mt-1 line-clamp-2 leading-relaxed">{d.subtext}</p>
                <div className="mt-3 inline-flex items-center text-xs font-bold text-white group-hover:text-amber-300">
                  Explore stays <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Handpicked Stays moved to Search page — accessible via "Explore more in Addis Ababa" */}

      {/* 
        ==================================================
        7. SPECIAL DEALS
        ==================================================
      */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-teal-900 via-primary-dark to-slate-900 p-6 sm:p-10 text-white shadow-xl">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                <Sparkles size={12} /> Limited Time Offers
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">Special deals in Addis Ababa</h2>
              <p className="text-sm text-slate-300 font-medium mt-1">Save more on your next stay in Ethiopia&apos;s capital.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SPECIAL_DEALS.map(({ property, dealTag, originalPrice }) => (
              <PropertyCard
                key={property.id}
                property={property}
                dealTag={dealTag}
                originalPrice={originalPrice}
                hideDecorations={true}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 
        ==================================================
        8. WHY GUZO SECTION
        ==================================================
      */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-extrabold text-primary uppercase tracking-widest">Platform Trust</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Why book with GUZO?</h2>
          <p className="text-sm text-slate-600 font-medium mt-1">Designed specifically for seamless Ethiopian accommodation discovery.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Verified stays</h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Discover properties verified through GUZO&apos;s trust and verification system.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
              <Lock size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Secure booking</h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Book securely with protected reservation and payment processes.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
              <Banknote size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Ethiopian prices</h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              See prices transparently in Ethiopian Birr (ETB) with local digital payment integration.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
              <Compass size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Local experience</h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Discover stays and unique regional destinations across Ethiopia.
            </p>
          </div>
        </div>
      </section>

      {/* 
        ==================================================
        9. POPULAR STAYS
        ==================================================
      */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Popular stays</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Trending accommodation choices across Ethiopia</p>
          </div>
          <Button
            onClick={() => navigate("/search")}
            className="rounded-xl bg-primary text-white font-bold text-xs px-4 py-2 hover:bg-primary-dark shadow-sm"
          >
            View all stays &rarr;
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {properties.slice(0, 4).map((p) => (
            <PropertyCard key={`popular-${p.id}`} property={p} />
          ))}
        </div>
      </section>

      {/* 
        ==================================================
        10. ETHIOPIAN TRAVEL BANNER
        ==================================================
      */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-12 shadow-xl">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1580746738099-1e0f5cbb3aa9?auto=format&fit=crop&w=1600&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Your Ethiopian journey starts in Addis Ababa.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              From the historic streets of Lalibela to the serene lakes of Bahir Dar, find a verified place to stay wherever your journey takes you.
            </p>
            <div className="mt-6">
              <Button
                size="lg"
                onClick={() => navigate("/search")}
                className="rounded-2xl bg-accent text-slate-950 font-extrabold hover:bg-amber-400 shadow-lg px-6"
              >
                Explore stays
              </Button>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
