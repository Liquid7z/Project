export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 bg-primary rounded-md">
         <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-foreground h-5 w-5"
          >
            <path d="M12 16.5l-3.5-3.5" />
            <path d="M17.5 6.5L14 10" />
            <path d="M14.5 13.5L18 10" />
            <path d="M12 22a10 10 0 00-9.9-9.5" />
            <path d="M2.5 12.5a10 10 0 0119.5-2" />
          </svg>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold font-headline text-glow">
        LiqAI
      </h1>
    </div>
  );
}
