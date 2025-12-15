import { Feather } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 bg-primary rounded-md">
        <Feather className="text-primary-foreground h-5 w-5" />
      </div>
      <h1 className="text-xl sm:text-2xl font-bold font-headline text-glow">
        LiqAI
      </h1>
    </div>
  );
}
