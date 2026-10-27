'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import CountryFlag from './CountryFlag';
import { COUNTRY_DIAL_CODES, type CountryDialCode } from './types';

interface CountryCodePickerProps {
  selectedCountryCode: string;
  onSelectCountry: (countryCode: string) => void;
  disabled?: boolean;
}

export default function CountryCodePicker({
  selectedCountryCode,
  onSelectCountry,
  disabled = false,
}: CountryCodePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCountry =
    COUNTRY_DIAL_CODES.find((c) => c.code === selectedCountryCode) || COUNTRY_DIAL_CODES[0];

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
    } else {
      setIsOpen(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  };

  // Click outside and Esc key listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filter countries by name or dial code
  const filteredCountries = COUNTRY_DIAL_CODES.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.dialCode.replace('+', '').includes(query) ||
      c.dialCode.includes(query)
    );
  });

  const handleSelect = (c: CountryDialCode) => {
    onSelectCountry(c.code);
    closeDropdown();
  };

  return (
    <div ref={containerRef} className="relative w-36 sm:w-44 shrink-0">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Selected country: ${selectedCountry.name} (${selectedCountry.dialCode})`}
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border rounded-lg bg-white transition cursor-pointer select-none ${
          isOpen
            ? 'border-[#234B36] ring-2 ring-[#234B36]/20'
            : 'border-[#E5E0D5] hover:border-[#234B36]/50'
        } ${disabled ? 'bg-[#EEF3EF] text-[#73776F]/50 cursor-not-allowed' : 'text-[#252923]'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CountryFlag countryCode={selectedCountry.code} width={22} height={15} />
          <span className="font-mono text-[#252923] tracking-tight">{selectedCountry.dialCode}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#73776F] shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-[#E5E0D5] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2.5 border-b border-[#E5E0D5]/60 bg-[#F8F5ED]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#73776F]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-[#E5E0D5] rounded-lg bg-white focus:outline-none focus:ring-1.5 focus:ring-[#234B36]/30 focus:border-[#234B36] text-[#252923]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#73776F] hover:text-[#252923] p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Countries List */}
          <div role="listbox" className="max-h-60 overflow-y-auto divide-y divide-[#E5E0D5]/20 py-1">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(c)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#EEF3EF] text-[#234B36] font-bold'
                        : 'hover:bg-[#F8F5ED] text-[#252923]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CountryFlag countryCode={c.code} width={22} height={15} />
                      <span className="text-xs truncate">{c.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="font-mono text-xs font-semibold text-[#73776F] bg-[#EEF3EF] px-1.5 py-0.5 rounded border border-[#E5E0D5]/40">
                        {c.dialCode}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#234B36] shrink-0" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-[#73776F]">
                No matching countries found for &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
