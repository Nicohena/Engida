'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Search,
  MapPin,
  Navigation,
  Loader2,
  Check,
  Compass,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';

export interface LocationSelectedData {
  address: string;
  city: string;
  subCity: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
}

interface HostLocationPickerMapInnerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  initialCity?: string;
  initialSubCity?: string;
  initialNeighborhood?: string;
  onLocationChange: (data: LocationSelectedData) => void;
}

// Default center: Bole, Addis Ababa, Ethiopia
const DEFAULT_CENTER: [number, number] = [8.9982, 38.7844];

// Popular Addis Ababa & Ethiopian landmarks for 1-click jump
const QUICK_PRESETS = [
  { name: 'Bole Medhanialem', lat: 8.9982, lng: 38.7844, subCity: 'Bole', neighborhood: 'Medhanialem', city: 'Addis Ababa' },
  { name: 'Atlas / Rwanda', lat: 9.0065, lng: 38.7758, subCity: 'Bole', neighborhood: 'Atlas', city: 'Addis Ababa' },
  { name: 'Kazanchis (ECA)', lat: 9.0175, lng: 38.7668, subCity: 'Kirkos', neighborhood: 'Kazanchis', city: 'Addis Ababa' },
  { name: 'Sarbet (Old Airport)', lat: 8.9961, lng: 38.7352, subCity: 'Kirkos', neighborhood: 'Sarbet', city: 'Addis Ababa' },
  { name: 'Piassa / Arada', lat: 9.0345, lng: 38.7516, subCity: 'Arada', neighborhood: 'Piassa', city: 'Addis Ababa' },
  { name: 'Gerji Imperial', lat: 9.0055, lng: 38.8105, subCity: 'Bole', neighborhood: 'Gerji', city: 'Addis Ababa' },
  { name: 'Bishoftu (Kuriftu)', lat: 8.7523, lng: 38.9785, subCity: '', neighborhood: 'Kuriftu', city: 'Bishoftu' },
  { name: 'Hawassa (Lake)', lat: 7.0504, lng: 38.4763, subCity: '', neighborhood: 'Piazza', city: 'Hawassa' },
];

interface SearchResultItem {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

export default function HostLocationPickerMapInner({
  initialLat,
  initialLng,
  initialAddress = '',
  initialCity = '',
  initialSubCity = '',
  initialNeighborhood = '',
  onLocationChange,
}: HostLocationPickerMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Initial coordinates resolution
  const startLat = typeof initialLat === 'number' && !isNaN(initialLat) ? initialLat : DEFAULT_CENTER[0];
  const startLng = typeof initialLng === 'number' && !isNaN(initialLng) ? initialLng : DEFAULT_CENTER[1];

  const [currentCoords, setCurrentCoords] = useState<[number, number]>([startLat, startLng]);
  const [addressSummary, setAddressSummary] = useState<string>(
    [initialAddress, initialNeighborhood, initialSubCity, initialCity].filter(Boolean).join(', ') ||
      'Bole, Addis Ababa, Ethiopia'
  );

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Custom luxury SVG Pin Marker
  const createCustomPinIcon = () => {
    return L.divIcon({
      className: 'custom-engida-pin',
      html: `
        <div style="position: relative; width: 42px; height: 48px; transform: translate(-21px, -48px); cursor: grab;">
          <svg viewBox="0 0 384 512" width="42" height="48" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));">
            <path fill="#234B36" stroke="#FFFFFF" stroke-width="20" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
          </svg>
          <div style="position: absolute; top: 11px; left: 12px; width: 18px; height: 18px; background: #E6C687; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; background: #234B36; border-radius: 50%;"></div>
          </div>
        </div>
      `,
      iconSize: [42, 48],
      iconAnchor: [21, 48],
    });
  };

  // Reverse geocode coordinates to parse address components
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setIsReverseGeocoding(true);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });

        if (!res.ok) throw new Error('Failed to reverse geocode');
        const data = await res.json();
        const addr = data.address || {};

        // Parse meaningful components
        const road = addr.road || addr.pedestrian || addr.footway || addr.amenity || addr.building || '';
        const city = addr.city || addr.town || addr.municipality || addr.state || 'Addis Ababa';
        const subCity = addr.suburb || addr.city_district || addr.district || '';
        const neighborhood = addr.neighbourhood || addr.quarter || addr.residential || '';

        const fullStreet = road || data.name || (neighborhood ? `${neighborhood} area` : 'Street Address');
        const summary = [fullStreet, neighborhood, subCity, city].filter(Boolean).join(', ');

        setAddressSummary(summary);

        onLocationChange({
          address: fullStreet,
          city,
          subCity,
          neighborhood,
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        });
      } catch (err) {
        console.warn('Reverse geocoding fallback:', err);
        // Fallback to basic coordinates if offline/rate-limited
        onLocationChange({
          address: initialAddress || 'Identified on Map',
          city: initialCity || 'Addis Ababa',
          subCity: initialSubCity || '',
          neighborhood: initialNeighborhood || '',
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6)),
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [initialAddress, initialCity, initialSubCity, initialNeighborhood, onLocationChange]
  );

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: currentCoords,
      zoom: 15,
      zoomControl: false,
    });

    // Add zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Official OpenStreetMap standard tiles (100% free, full Ethiopian detail, no API key required)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add draggable marker
    const marker = L.marker(currentCoords, {
      icon: createCustomPinIcon(),
      draggable: true,
      autoPan: true,
    }).addTo(map);

    marker.bindPopup(
      `<div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #234B36;">
        📍 Drag pin to exact property building
      </div>`
    );

    // Marker drag end event
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCurrentCoords([pos.lat, pos.lng]);
      reverseGeocode(pos.lat, pos.lng);
    });

    // Click map to reposition marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setCurrentCoords([e.latlng.lat, e.latlng.lng]);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []);

  // Update marker when coords change from search or preset
  const setMapLocation = (lat: number, lng: number, zoom = 16) => {
    setCurrentCoords([lat, lng]);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);
    }
  };

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Query OpenStreetMap Nominatim specifically biased to Ethiopia (countrycodes=et)
        const q = encodeURIComponent(searchQuery.trim());
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&countrycodes=et&limit=5`;
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en' },
        });
        if (res.ok) {
          const data: SearchResultItem[] = await res.json();
          setSearchResults(data);
          setShowDropdown(data.length > 0);
        }
      } catch (err) {
        console.warn('Map search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle selecting a search result
  const handleSelectResult = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lng)) return;

    setMapLocation(lat, lng, 16);
    setShowDropdown(false);
    setSearchQuery('');
    reverseGeocode(lat, lng);
  };

  // Preset button click
  const handleSelectPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    setMapLocation(preset.lat, preset.lng, 16);
    onLocationChange({
      address: preset.name,
      city: preset.city,
      subCity: preset.subCity,
      neighborhood: preset.neighborhood,
      latitude: preset.lat,
      longitude: preset.lng,
    });
    setAddressSummary(`${preset.name}, ${preset.subCity ? preset.subCity + ', ' : ''}${preset.city}`);
  };

  // Geolocation button
  const handleUseCurrentLocation = () => {
    // If on insecure HTTP context on non-localhost IP, modern browsers strictly block geolocation API
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setLocateError(
        'Browser GPS requires an HTTPS or localhost connection. You can use the search bar above or click one of the popular Ethiopian hubs below (e.g. Bole, Kazanchis, Atlas) to immediately pinpoint your property.'
      );
      return;
    }

    if (!navigator.geolocation) {
      setLocateError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapLocation(lat, lng, 17);
        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocateError('GPS permission was denied by your browser. Use the search bar or presets below to select your property location.');
        } else if (err.code === 2) {
          setLocateError('GPS position unavailable. Please use the search bar or presets below.');
        } else {
          setLocateError('Could not obtain current location. Use the search bar or presets to pinpoint.');
        }
        console.warn('Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search Bar + GPS Locate Trigger */}
      <div className="relative">
        <div className="flex items-center gap-2">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#73776F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search landmark, street, or area (e.g. Bole Medhanialem, Atlas, Sarbet)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5E0D5] bg-[#FCFAF6] text-xs font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition shadow-2xs"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-[#234B36] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Use My GPS Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#234B36]/30 bg-[#234B36]/10 hover:bg-[#234B36]/20 text-[#234B36] text-xs font-bold transition shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
            title="Pinpoint your current location via device GPS"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#234B36]" />
            ) : (
              <Navigation className="w-4 h-4 text-[#234B36]" />
            )}
            <span className="hidden sm:inline">Use My Location</span>
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E5E0D5] rounded-xl shadow-xl z-[1000] overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectResult(item)}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#252923] hover:bg-[#F8F5ED] flex items-start gap-2.5 border-b border-[#EEF3EF] last:border-b-0 transition"
              >
                <MapPin className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {locateError && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{locateError}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocateError(null)}
            className="p-1 rounded-md hover:bg-amber-100 text-amber-700 transition cursor-pointer shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Landmark Preset Badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
        <span className="text-[#73776F] font-bold shrink-0 flex items-center gap-1">
          <Compass className="w-3 h-3 text-[#234B36]" /> Popular:
        </span>
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E0D5] hover:border-[#234B36] text-[#252923] font-semibold transition shrink-0 hover:bg-[#F8F5ED] cursor-pointer shadow-2xs"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Leaflet Map Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E5E0D5] shadow-sm">
        <div ref={mapContainerRef} className="w-full h-80 z-0" />

        {/* Floating Instruction Banner */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#E5E0D5] shadow-md flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-bold text-[#252923]">
            {isReverseGeocoding ? (
              <span className="inline-flex items-center gap-1 text-[#234B36]">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching address details…
              </span>
            ) : (
              'Drag the pin or click on map to pinpoint property'
            )}
          </span>
        </div>

        {/* Live Detected Coordinates & Status Strip */}
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-[#E5E0D5] shadow-md flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-[#234B36] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                Selected Location:
              </span>
              <p className="text-xs font-bold text-[#252923] truncate">{addressSummary}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono bg-[#234B36]/10 text-[#234B36] font-bold px-2 py-0.5 rounded-md">
              {currentCoords[0].toFixed(4)}°, {currentCoords[1].toFixed(4)}°
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${currentCoords[0]},${currentCoords[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-[#234B36] hover:underline inline-flex items-center gap-0.5"
            >
              Verify in Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
