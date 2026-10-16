'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, content, LandingTranslations } from '../lib/landing-content';

export type CalendarType = 'gregorian' | 'ethiopian';
export type Persona = 'guest' | 'host';

interface LandingContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  calendarType: CalendarType;
  setCalendarType: (cal: CalendarType) => void;
  persona: Persona;
  setPersona: (p: Persona) => void;
  t: LandingTranslations;
  searchDestination: string;
  setSearchDestination: (dest: string) => void;
  activeAiPrompt: string;
  setActiveAiPrompt: (prompt: string) => void;
}

const LandingContext = createContext<LandingContextType | undefined>(undefined);

export function LandingProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [calendarType, setCalendarType] = useState<CalendarType>('gregorian');
  const [persona, setPersona] = useState<Persona>('guest');
  const [searchDestination, setSearchDestination] = useState<string>('');
  const [activeAiPrompt, setActiveAiPrompt] = useState<string>('');

  const t = content[language];

  return (
    <LandingContext.Provider
      value={{
        language,
        setLanguage,
        calendarType,
        setCalendarType,
        persona,
        setPersona,
        t,
        searchDestination,
        setSearchDestination,
        activeAiPrompt,
        setActiveAiPrompt,
      }}
    >
      {children}
    </LandingContext.Provider>
  );
}

export function useLanding() {
  const ctx = useContext(LandingContext);
  if (!ctx) {
    throw new Error('useLanding must be used within a LandingProvider');
  }
  return ctx;
}
