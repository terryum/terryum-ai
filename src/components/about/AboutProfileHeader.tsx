import type { ReactNode } from 'react';
import ProfileImage from '@/components/ProfileImage';
import SocialIcons from '@/components/SocialIcons';

type AboutProfileHeaderProps = {
  name: string;
  bio: ReactNode;
  isPageHeading?: boolean;
};

const nameClassName = 'text-2xl font-bold text-text-primary tracking-tight';

export default function AboutProfileHeader({
  name,
  bio,
  isPageHeading = false,
}: AboutProfileHeaderProps) {
  return (
    <header className="mb-10 flex flex-col items-center text-center">
      <ProfileImage alt={name} size={144} className="mb-4" />
      {isPageHeading ? (
        <h1 className={nameClassName}>{name}</h1>
      ) : (
        <p className={nameClassName}>{name}</p>
      )}
      <div className="prose prose-sm prose-neutral mt-1 max-w-none text-sm leading-relaxed text-text-muted dark:prose-invert">
        {bio}
      </div>
      <SocialIcons className="mt-3" />
    </header>
  );
}
