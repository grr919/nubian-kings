export default function StelaMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`stelaMark ${className}`} viewBox="0 0 54 64" aria-hidden="true">
      <path d="M12 60h30V17l-4-9-11-6-11 6-4 9v43Z" />
      <path d="M12 18h30M12 28h30M12 38h30M12 48h30" />
      <path d="M22 60V48h10v12M22 22h10v6M22 32h10v6" />
    </svg>
  );
}
