import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  ShieldCheck,
  Lock,
  CheckCircle2,
  MapPin,
  Mail,
  Phone,
  ChevronDown
} from "lucide-react";

export function Footer() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    explore: false,
    company: false,
    support: false,
    contact: false,
  });

  function toggleSection(section: string) {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  return (
    <footer aria-label="Footer" className="border-t border-slate-200 bg-white text-slate-600 font-sans">
      {/* Main Footer Body Container */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          {/* 
            ==================================================
            3. TOP FOOTER BRAND AREA (Left Side, 4 Columns wide)
            ==================================================
          */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              {/* GUZO Logo (Matching Navbar branding) */}
              <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md transition-transform group-hover:scale-105">
                  <Compass size={22} />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  GUZO <span className="text-accent">ENGIDA</span>
                </span>
              </Link>

              {/* Tagline */}
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">
                Your journey starts with the right stay.
              </p>

              {/* GUZO Short Description */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal max-w-sm mb-4">
                GUZO connects guests with trusted hotels, guesthouses, apartments, lodges and other stays across Ethiopia.
              </p>
              
            </div>
            
          </div> 

          {/* 
            ==================================================
            4 COLUMNS AREA (Desktop 2 cols each, Mobile Collapsible)
            ==================================================
          */} 
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 5. EXPLORE COLUMN */}
            <div className="border-b border-slate-100 pb-4 lg:border-none lg:pb-0">
              <button
                type="button"
                onClick={() => toggleSection("explore")}
                className="w-full flex items-center justify-between text-left text-sm font-extrabold text-[#134E4A] mb-3 lg:cursor-default"
              >
                <span>Explore</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform lg:hidden ${
                    openSections.explore ? "rotate-180" : ""
                  }`}
                />
              </button>
              <ul
                className={`space-y-2.5 text-xs font-semibold text-slate-600 transition-all ${
                  openSections.explore ? "block" : "hidden lg:block"
                }`}
              >
                <li>
                  <Link to="/search" className="hover:text-primary transition-colors">
                    Find a Stay
                  </Link>
                </li>
                <li>
                  <Link to="/search?location=Addis%20Ababa" className="hover:text-primary transition-colors">
                    Destinations
                  </Link>
                </li>
                <li>
                  <Link to="/search?propertyType=HOTEL" className="hover:text-primary transition-colors">
                    Property Types
                  </Link>
                </li>
                <li>
                  <Link to="/search?sort=recommended" className="hover:text-primary transition-colors">
                    Special Deals
                  </Link>
                </li>
              </ul>
            </div>

            {/* 6. COMPANY COLUMN */}
            <div className="border-b border-slate-100 pb-4 lg:border-none lg:pb-0">
              <button
                type="button"
                onClick={() => toggleSection("company")}
                className="w-full flex items-center justify-between text-left text-sm font-extrabold text-[#134E4A] mb-3 lg:cursor-default"
              >
                <span>Company</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform lg:hidden ${
                    openSections.company ? "rotate-180" : ""
                  }`}
                />
              </button>
              <ul
                className={`space-y-2.5 text-xs font-semibold text-slate-600 transition-all ${
                  openSections.company ? "block" : "hidden lg:block"
                }`}
              >
                <li>
                  <a href="#about" className="hover:text-primary transition-colors">
                    About GUZO
                  </a>
                </li>
                <li>
                  <a href="#host" className="hover:text-primary transition-colors">
                    Become a Host
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-primary transition-colors">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-primary transition-colors">
                    How GUZO Works
                  </a>
                </li>
              </ul>
            </div>

            {/* 7. SUPPORT COLUMN */}
            <div className="border-b border-slate-100 pb-4 lg:border-none lg:pb-0">
              <button
                type="button"
                onClick={() => toggleSection("support")}
                className="w-full flex items-center justify-between text-left text-sm font-extrabold text-[#134E4A] mb-3 lg:cursor-default"
              >
                <span>Support</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform lg:hidden ${
                    openSections.support ? "rotate-180" : ""
                  }`}
                />
              </button>
              <ul
                className={`space-y-2.5 text-xs font-semibold text-slate-600 transition-all ${
                  openSections.support ? "block" : "hidden lg:block"
                }`}
              >
                <li>
                  <a href="#help" className="hover:text-primary transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#safety" className="hover:text-primary transition-colors">
                    Safety & Trust
                  </a>
                </li>
                <li>
                  <a href="#privacy" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#terms" className="hover:text-primary transition-colors">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#report" className="hover:text-primary transition-colors">
                    Report an Issue
                  </a>
                </li>
              </ul>
            </div>

            {/* 8 & 9. CONTACT COLUMN (Vertical alignment with GUZO Teal icons) */}
            <div className="pb-4 lg:pb-0">
              <button
                type="button"
                onClick={() => toggleSection("contact")}
                className="w-full flex items-center justify-between text-left text-sm font-extrabold text-[#134E4A] mb-3 lg:cursor-default"
              >
                <span>Contact</span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform lg:hidden ${
                    openSections.contact ? "rotate-180" : ""
                  }`}
                />
              </button>
              <ul
                className={`space-y-3 text-xs font-semibold text-slate-600 transition-all ${
                  openSections.contact ? "block" : "hidden lg:block"
                }`}
              >
                <li className="flex items-center gap-2 text-slate-700">
                  <MapPin size={15} className="text-primary shrink-0" />
                  <span>Ethiopia</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Mail size={15} className="text-primary shrink-0" />
                  <span className="truncate" title="Development placeholder">support@guzo.example</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <Phone size={15} className="text-primary shrink-0" />
                  <span className="truncate" title="Development placeholder">+251 XXX XXX XXX</span>
                </li>
              </ul>
            </div>
          </div>
        </div>



        {/* 
          ==================================================
          15, 16, 17. DIVIDER, COPYRIGHT & LEGAL LINKS
          ==================================================
        */}
        <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <p>© 2026 GUZO. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#terms" className="hover:text-primary transition-colors">
              Terms & Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
