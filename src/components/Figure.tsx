'use client';

import { useState } from 'react';
import Image from 'next/image';
import ImageLightbox from './ImageLightbox';
import { FIGURE_DIMENSIONS } from '@/lib/site-config';
import { useFigureGroup } from '@/contexts/FigureGroupContext';

interface FigureProps {
  src: string;
  caption: string;
  alt?: string;
  number?: number;
  priority?: boolean;
  isCover?: boolean;
}

export default function Figure({ src, caption, alt, number, priority, isCover }: FigureProps) {
  const [open, setOpen] = useState(false);
  const { figures } = useFigureGroup();

  const groupIndex = figures.findIndex((f) => f.number === number);
  const hasGroup = figures.length > 1 && groupIndex >= 0;

  // Use localized caption from context when number matches (enables ko/en switching)
  const contextCaption = number != null ? figures.find((f) => f.number === number)?.caption : undefined;
  const displayCaption = contextCaption ?? caption;

  const lightboxItems = hasGroup ? figures : [{ src, caption: displayCaption, number: number || 0 }];
  const initialIndex = hasGroup ? groupIndex : 0;
  const [lightboxIndex, setLightboxIndex] = useState(initialIndex);

  const imgWidth = isCover ? 1200 : FIGURE_DIMENSIONS.width;
  const imgHeight = isCover ? 675 : FIGURE_DIMENSIONS.height;

  const handleOpen = () => {
    setLightboxIndex(initialIndex);
    setOpen(true);
  };

  return (
    <>
      <figure className={`${isCover ? 'mb-8' : 'my-6'} cursor-pointer group`} onClick={handleOpen}>
        <div className="rounded-lg overflow-hidden bg-bg-surface flex justify-center relative">
          <Image
            src={src}
            alt={alt || caption}
            width={imgWidth}
            height={imgHeight}
            className="w-full h-auto max-h-96 object-contain"
            sizes="(max-width: 768px) 100vw, 672px"
            priority={priority ?? isCover}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
            <svg
              className="w-8 h-8 text-white/0 group-hover:text-white/80 transition-colors drop-shadow-lg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
              />
            </svg>
          </div>
        </div>
        {displayCaption && (
          <figcaption className="text-sm text-text-muted text-left mt-2 leading-relaxed">
            {displayCaption}
          </figcaption>
        )}
      </figure>

      {open && (
        <ImageLightbox
          items={lightboxItems}
          currentIndex={lightboxIndex}
          onClose={() => setOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
