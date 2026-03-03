import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Terry Um',
    default: 'Terry Um',
  },
  description: 'AI & Robotics researcher, startup founder — exploring Physical AI for manufacturing innovation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className="font-sans leading-relaxed">
        {children}
      </body>
    </html>
  );
}
