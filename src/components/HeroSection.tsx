import type { ReactNode } from 'react';
import SocialIcons from './SocialIcons';
import ProfileImage from './ProfileImage';

interface HeroSectionProps {
  name: string;
  bio: ReactNode;
}

export default function HeroSection({ name, bio }: HeroSectionProps) {
  return (
    <section className="flex flex-col sm:flex-row items-center gap-6 py-10 pb-4 border-b border-line-default">
      {/* Profile photo */}
      <div className="flex-shrink-0">
        <ProfileImage alt={name} size={112} />
      </div>

      <div>
        <h1 className="text-[26px] font-semibold text-text-primary tracking-tight">
          {name}
        </h1>
        <div className="text-sm text-text-muted leading-relaxed mt-1 prose prose-sm prose-neutral dark:prose-invert max-w-none">
          {bio}
        </div>
        <SocialIcons className="mt-3" />
      </div>
    </section>
  );
}
