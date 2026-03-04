'use client';

import { useState } from 'react';
import Image from 'next/image';
import ImageLightbox from './ImageLightbox';
import { FIGURE_DIMENSIONS } from '@/lib/site-config';

interface FigureProps {
  src: string;
  caption: string;
  alt?: string;
  number?: number;
}

export default function Figure({ src, caption, alt, number }: FigureProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <figure className="my-6 cursor-pointer group" onClick={() => setOpen(true)}>
        <div className="rounded-lg overflow-hidden bg-bg-surface flex justify-center relative">
          <Image
            src={src}
            alt={alt || caption}
            width={FIGURE_DIMENSIONS.width}
            height={FIGURE_DIMENSIONS.height}
            className="w-full h-auto max-h-96 object-contain"
            sizes="(max-width: 768px) 100vw, 672px"
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
        {caption && (
          <figcaption className="text-sm text-text-muted text-left mt-2 leading-relaxed">
            {caption}
          </figcaption>
        )}
      </figure>

      {open && (
        <ImageLightbox
          items={[{ src, caption, number: number || 0 }]}
          currentIndex={0}
          onClose={() => setOpen(false)}
          onNavigate={() => {}}
        />
      )}
    </>
  );
}
