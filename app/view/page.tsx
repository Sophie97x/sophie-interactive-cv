import type { Metadata } from 'next';
import PublishedPortfolio from '@/components/published-portfolio';
export const metadata: Metadata = {
  title: 'My little room',
  description: 'A personal CV in an interactive attic.',
};
export default function ViewPage() {
  return <PublishedPortfolio />;
}
