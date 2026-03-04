'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import ImageLightbox from './ImageLightbox';

interface GalleryItem {
  src: string;
  caption: string;
  number: number;
}

interface ImageGalleryProps {
  items: GalleryItem[];
}

export default function ImageGallery({ items }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative group">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-bg-base/80 border border-line-default text-text-muted hover:text-accent hover:border-accent transition-colors opacity-0 group-hover:opacity-100 hidden md:block"
        aria-label="Scroll left"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
      >
        {items.map((item, i) => (
          <button
            key={item.number}
            onClick={() => setLightboxIndex(i)}
            className="flex-none w-48 md:w-56 snap-start cursor-pointer group/item text-left"
          >
            <div className="rounded-lg overflow-hidden bg-bg-surface border border-line-default hover:border-accent transition-colors">
              <Image
                src={item.src}
                alt={item.caption}
                width={224}
                height={160}
                className="w-full h-32 md:h-36 object-contain bg-white"
                sizes="224px"
              />
            </div>
            <p className="text-xs text-text-muted text-left mt-1.5 line-clamp-2 leading-relaxed min-h-[2.75rem]">
              {item.caption}
            </p>
          </button>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-bg-base/80 border border-line-default text-text-muted hover:text-accent hover:border-accent transition-colors opacity-0 group-hover:opacity-100 hidden md:block"
        aria-label="Scroll right"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
