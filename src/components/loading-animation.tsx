import { Loader } from "lucide-react";

export function LoadingAnimation({ text = "Processing..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 rounded-lg glass-pane">
        <Loader className="h-16 w-16 animate-spin text-accent" />
        <p className="text-xl font-headline font-medium text-glow animate-pulse">{text}</p>
      </div>
    </div>
  );
}
