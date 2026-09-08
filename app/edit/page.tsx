import type { Metadata } from 'next';
import Editor from '@/components/editor';
export const metadata: Metadata = {
  title: 'Make your own little room',
  description:
    'Build a personal CV with an interactive attic and share it with a link.',
};
export default function EditPage() {
  return <Editor />;
}
