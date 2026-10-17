'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CalendarType = 'gregorian' | 'ethiopian';

interface LandingContextType {
  calendarType: CalendarType;
  setCalendarType: (cal: CalendarType) => void;
  searchDestination: string;
  setSearchDestination: (dest: string) => void;
}

const LandingContext = createContext<LandingContextType | undefined>(undefined);

export function LandingProvider({ children }: { children: ReactNode }) {
  const [calendarType, setCalendarType] = useState<CalendarType>('gregorian');
  const [searchDestination, setSearchDestination] = useState<string>('');

  return (
    <LandingContext.Provider
      value={{
        calendarType,
        setCalendarType,
        searchDestination,
        setSearchDestination,
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
