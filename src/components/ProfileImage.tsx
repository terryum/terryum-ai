'use client';

import { useState } from 'react';
import Image from 'next/image';
import ImageLightbox from './ImageLightbox';
import { SITE_CONFIG } from '@/lib/site-config';

interface ProfileImageProps {
  alt: string;
  size?: number;
  className?: string;
}

export default function ProfileImage({ alt, size = 112, className = '' }: ProfileImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative rounded-full overflow-hidden bg-bg-surface cursor-pointer group ${className}`}
        style={{ width: size, height: size }}
        aria-label="View profile photo"
      >
        <Image
          src={SITE_CONFIG.profileImage}
          alt={alt}
          fill
          sizes={`${size}px`}
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
          <svg
            className="w-6 h-6 text-white/0 group-hover:text-white/80 transition-colors drop-shadow-lg"
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
      </button>

      {open && (
        <ImageLightbox
          items={[{ src: SITE_CONFIG.profileImageOriginal, caption: alt, number: 0 }]}
          currentIndex={0}
          onClose={() => setOpen(false)}
          onNavigate={() => {}}
        />
      )}
    </>
  );
}
