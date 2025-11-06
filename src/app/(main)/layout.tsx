import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'StudyMart - Your Learning Platform',
  description: 'Access premium study materials including PDFs and video courses.',};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
