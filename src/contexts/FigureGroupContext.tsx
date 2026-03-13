'use client';

import { createContext, useContext } from 'react';

interface GalleryItem {
  src: string;
  caption: string;
  number: number;
}

interface FigureGroupContextValue {
  figures: GalleryItem[];
}

const FigureGroupContext = createContext<FigureGroupContextValue>({ figures: [] });

export function FigureGroupProvider({
  figures,
  children,
}: {
  figures: GalleryItem[];
  children: React.ReactNode;
}) {
  return (
    <FigureGroupContext.Provider value={{ figures }}>
      {children}
    </FigureGroupContext.Provider>
  );
}

export function useFigureGroup() {
  return useContext(FigureGroupContext);
}
