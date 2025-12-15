import { Feather } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Feather className="text-primary h-6 w-6" />
      <h1 className="text-xl sm:text-2xl font-bold font-headline text-glow">
        LiqAI
      </h1>
    </div>
  );
}
