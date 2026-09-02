export default function EparchCrownMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`eparchCrownMark ${className}`} viewBox="0 0 64 52" aria-hidden="true">
      <path d="M14 27C8 25 4 18 6 7c4 6 9 8 15 7-1 6-3 10-7 13Z" />
      <path d="M50 27c6-2 10-9 8-20-4 6-9 8-15 7 1 6 3 10 7 13Z" />
      <path d="M14 27c11-8 25-8 36 0l-3 18H17l-3-18Z" />
      <path d="M16 34h32M18 41h28M32 5v15M27 10h10" />
      <circle cx="24" cy="34" r="2" /><circle cx="32" cy="32" r="2" /><circle cx="40" cy="34" r="2" />
    </svg>
  );
}
