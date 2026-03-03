import SocialIcons from './SocialIcons';

interface FooterProps {
  copyright: string;
}

export default function Footer({ copyright }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line-default mt-16">
      <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            &copy; {year} {copyright}
          </p>
          <SocialIcons />
        </div>
      </div>
    </footer>
  );
}
