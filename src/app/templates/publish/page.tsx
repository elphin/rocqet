import { Metadata } from 'next';
import { PublishTemplate } from './client';

export const metadata: Metadata = {
  title: 'Publish Template | ROCQET',
  description: 'Share your prompt template with the ROCQET community',
};

export default function PublishTemplatePage() {
  return <PublishTemplate />;
}