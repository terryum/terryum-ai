import Image from 'next/image';
import SocialIcons from './SocialIcons';

interface HeroSectionProps {
  name: string;
  tagline: string;
}

export default function HeroSection({ name, tagline }: HeroSectionProps) {
  return (
    <section className="flex flex-col sm:flex-row items-center gap-6 py-10">
      {/* Profile photo */}
      <div className="flex-shrink-0 w-28 h-28 relative rounded-full overflow-hidden bg-bg-surface">
        <Image
          src="/images/profile-placeholder.svg"
          alt={name}
          fill
          sizes="112px"
          className="object-cover"
          priority
        />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {name}
        </h1>
        <p className="text-text-secondary mt-1">{tagline}</p>
        <SocialIcons className="mt-3" />
      </div>
    </section>
  );
}
