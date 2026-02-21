import MemoryDetailClient from './MemoryDetailClient';

export default function MemoryDetailPage({ params }: { params: { id: string } }) {
  return <MemoryDetailClient id={params.id} />;
}
