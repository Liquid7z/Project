'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/notes');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
