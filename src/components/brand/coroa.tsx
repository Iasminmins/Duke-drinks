/** detalhe decorativo usado acima do nome e nos títulos (neutro, serve para qualquer negócio) */
export function Coroa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 22" className={className} aria-hidden fill="currentColor">
      <path d="M16 1.5 18.6 8.4 25.5 11 18.6 13.6 16 20.5 13.4 13.6 6.5 11 13.4 8.4Z" />
      <circle cx="4" cy="11" r="1.6" />
      <circle cx="28" cy="11" r="1.6" />
    </svg>
  );
}
