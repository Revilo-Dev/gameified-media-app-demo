export function TomatoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 6c4.4 0 8 3.3 8 7.4 0 4.2-3.6 7.6-8 7.6s-8-3.4-8-7.6C4 9.3 7.6 6 12 6Z" fill="currentColor" />
      <path d="M9.2 5.8c.8-1.7 2-2.8 2.8-3 .8.2 2 1.3 2.8 3-1.3-.6-2-.8-2.8-.8s-1.5.2-2.8.8Z" fill="#6EBE4B" />
      <path d="M12 6c1.5-1.4 3.3-2.1 5.4-2-1 1.8-2.2 2.8-3.5 3.2M12 6c-1.5-1.4-3.3-2.1-5.4-2 1 1.8 2.2 2.8 3.5 3.2" stroke="#6EBE4B" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
