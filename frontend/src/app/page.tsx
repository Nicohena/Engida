'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  ShieldCheck,
  Calendar,
  CreditCard,
  Lock,
  Globe,
  ArrowRight,
  Mail,
  Send,
} from 'lucide-react';

export default function Home() {
  // Section 1 — Explore Categories (Exactly 4 Cards)
  const exploreCategories = [
    {
      title: 'Hotels',
      image: '/images/master_bedroom.png',
      description: 'Premium hotel accommodations offering exceptional comfort, hospitality, and modern facilities.',
    },
    {
      title: 'Guesthouses',
      image: '/images/studio.png',
      description: 'Welcoming guesthouses providing personal service and relaxed home-like environments.',
    },
    {
      title: 'Lodges',
      image: '/images/villa.png',
      description: 'Scenic lodge retreats nestled in natural surroundings and breathtaking Ethiopian landscapes.',
    },
    {
      title: 'Local Stays',
      image: '/images/single_room.png',
      description: 'Authentic local stays for immersive culture and memorable travel experiences.',
    },
  ];

  // Section 3 — Features (Exactly 6 Features)
  const featuresList = [
    {
      icon: Search,
      title: 'Discover Stays',
      description: 'Easily discover accommodation options across Ethiopia.',
    },
    {
      icon: ShieldCheck,
      title: 'Verified Properties',
      description: 'Find trusted hosts and verified properties.',
    },
    {
      icon: Calendar,
      title: 'Easy Booking',
      description: 'Make accommodation reservations through a simple process.',
    },
    {
      icon: CreditCard,
      title: 'Local Payments',
      description: 'Support payment methods suitable for the Ethiopian market.',
    },
    {
      icon: Lock,
      title: 'Secure Platform',
      description: 'Protect users and their information with secure platform design.',
    },
    {
      icon: Globe,
      title: 'Localized Experience',
      description: 'Support Ethiopian users through local language, currency and context.',
    },
  ];

  // Section 4 — Social & Contact Links (Exactly 4 Clickable Options)
  const contactLinks = [
    {
      name: 'Telegram',
      handle: '@Engida',
      url: 'https://t.me/Engida',
      bgHover: 'hover:border-[#229ED9] hover:bg-[#229ED9]/5',
      iconColor: 'text-[#229ED9]',
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.462-.169.585-.385.781-.593.8-.452.042-.796-.299-1.233-.586-.684-.449-1.071-.728-1.734-1.165-.766-.505-.27-.783.167-1.237.114-.118 2.096-1.922 2.135-2.086.005-.021.009-.098-.037-.139s-.114-.027-.163-.016c-.07.016-1.183.753-3.339 2.209-.316.217-.602.324-.858.318-.482-.011-1.41-.273-2.101-.498-.847-.276-1.521-.422-1.463-.892.03-.245.367-.497 1.011-.756 3.963-1.724 6.606-2.862 7.929-3.413 3.778-1.574 4.563-1.848 5.073-1.857.112-.002.363.026.525.158.137.111.175.262.193.369.019.108.043.354.025.547z" />
        </svg>
      ),
    },
    {
      name: 'Instagram',
      handle: '@Engida',
      url: 'https://instagram.com/Engida',
      bgHover: 'hover:border-[#E4405F] hover:bg-[#E4405F]/5',
      iconColor: 'text-[#E4405F]',
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      handle: '@Engida',
      url: 'https://facebook.com/Engida',
      bgHover: 'hover:border-[#1877F2] hover:bg-[#1877F2]/5',
      iconColor: 'text-[#1877F2]',
      icon: (
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: 'Email',
      handle: 'Engida@gmail.com',
      url: 'mailto:Engida@gmail.com',
      bgHover: 'hover:border-[#EA4335] hover:bg-[#EA4335]/5',
      iconColor: 'text-[#EA4335]',
      icon: <Mail className="w-6 h-6" />,
    },
  ];

  return (
    <div className="flex flex-col gap-20 text-[#000000] py-4">
      {/* ---------------------------------------------------- */}
      {/* HERO / INTRODUCTION */}
      {/* ---------------------------------------------------- */}
      <section className="relative bg-gradient-to-b from-[#F4F7FC] to-white rounded-3xl p-8 sm:p-14 border border-[#CBD5E1] shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
          {/* Hero Content */}
          <div className="space-y-6 text-left">
            <div className="inline-block px-3.5 py-1 rounded-full bg-[#E3EAF5] text-[#33599E] text-xs font-black uppercase tracking-wider">
              Ethiopian Tourism & Accommodation
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#000000] tracking-tight leading-tight">
              Ethiopian Accommodation & Tourism Marketplace
            </h1>

            <p className="text-[#334155] text-base sm:text-lg font-medium leading-relaxed">
              Engida connects travelers and guests with trusted accommodation providers across Ethiopia.
            </p>

            <div className="pt-2">
              <Link
                href="#explore"
                className="inline-flex items-center gap-2 bg-[#33599E] hover:bg-[#234079] text-white font-black text-sm px-7 py-3.5 rounded-xl shadow-md transition"
              >
                Explore Engida <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-md bg-[#F4F7FC]">
            <Image
              src="/images/villa.png"
              alt="Engida Ethiopian Accommodation"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 1 — EXPLORE / SERVICES (EXACTLY 4 CARDS) */}
      {/* ---------------------------------------------------- */}
      <section id="explore" className="scroll-mt-24 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-[#000000] tracking-tight">
            Explore Accommodations
          </h2>
          <p className="text-[#334155] text-sm font-medium">
            Discover diverse stays tailored for every travel experience in Ethiopia.
          </p>
        </div>

        {/* 4 Image Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {exploreCategories.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden shadow-xs hover:shadow-md transition flex flex-col"
            >
              <div className="relative h-48 w-full bg-[#F4F7FC]">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-start">
                <h3 className="text-lg font-black text-[#000000]">{item.title}</h3>
                <p className="text-[#334155] text-xs font-normal leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 2 — ABOUT US */}
      {/* ---------------------------------------------------- */}
      <section id="about" className="scroll-mt-24 bg-[#F4F7FC] rounded-3xl p-8 sm:p-12 border border-[#CBD5E1]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
          {/* About Image */}
          <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-sm bg-white">
            <Image
              src="/images/studio.png"
              alt="About Engida Marketplace"
              fill
              className="object-cover"
            />
          </div>

          {/* About Content */}
          <div className="space-y-4 text-left">
            <span className="text-xs font-black uppercase tracking-wider text-[#33599E]">
              About Engida
            </span>

            <h2 className="text-3xl font-black text-[#000000] tracking-tight">
              Dedicated to Ethiopian Hospitality
            </h2>

            <p className="text-[#334155] text-sm leading-relaxed font-medium">
              Engida is a digital accommodation and tourism marketplace built specifically for the Ethiopian market.
            </p>

            <p className="text-[#334155] text-sm leading-relaxed font-medium">
              Our mission is to connect guests with trusted accommodation providers across Ethiopia, making travel and lodging seamless, reliable, and accessible for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 3 — FEATURES (EXACTLY 6 FEATURES) */}
      {/* ---------------------------------------------------- */}
      <section id="features" className="scroll-mt-24 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-[#000000] tracking-tight">
            Platform Features
          </h2>
          <p className="text-[#334155] text-sm font-medium">
            Designed to empower guests and hosts throughout Ethiopia.
          </p>
        </div>

        {/* 6 Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {featuresList.map((feat, idx) => {
            const IconComponent = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-[#CBD5E1] shadow-xs hover:border-[#33599E] transition space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F4F7FC] border border-[#CBD5E1] text-[#33599E] flex items-center justify-center">
                  <IconComponent className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-black text-[#000000]">{feat.title}</h3>
                <p className="text-[#334155] text-xs font-normal leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* SECTION 4 — GET IN TOUCH (4 CLICKABLE SOCIAL CARDS) */}
      {/* ---------------------------------------------------- */}
      <section id="contact" className="scroll-mt-24 bg-white rounded-3xl p-8 sm:p-12 border border-[#CBD5E1] shadow-xs max-w-4xl mx-auto w-full space-y-8 text-center">
        <div className="max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl font-black text-[#000000] tracking-tight">
            Get In Touch
          </h2>
          <p className="text-[#334155] text-sm font-medium">
            Connect with Engida across our official channels or send us an email.
          </p>
        </div>

        {/* 4 Clickable Social / Contact Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {contactLinks.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target={item.url.startsWith('mailto:') ? '_self' : '_blank'}
              rel="noopener noreferrer"
              className={`bg-white border border-[#CBD5E1] p-5 rounded-2xl flex items-center gap-4 transition-all duration-200 shadow-xs hover:shadow-md ${item.bgHover} group`}
            >
              <div className={`p-3 rounded-xl bg-[#F4F7FC] border border-[#CBD5E1] ${item.iconColor} group-hover:scale-110 transition-transform shrink-0`}>
                {item.icon}
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="text-base font-black text-[#000000] group-hover:text-[#33599E] transition-colors">
                  {item.name}
                </h3>
                <p className="text-xs font-bold text-[#334155] truncate">
                  {item.handle}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
