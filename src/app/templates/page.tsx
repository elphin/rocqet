import { Metadata } from 'next';
import { TemplateGallery } from './client';

export const metadata: Metadata = {
  title: 'Template Library | ROCQET',
  description: 'Discover and share AI prompt templates. Browse curated collections of prompts for marketing, coding, writing, and more.',
};

export default function TemplatesPage() {
  return <TemplateGallery />;
}