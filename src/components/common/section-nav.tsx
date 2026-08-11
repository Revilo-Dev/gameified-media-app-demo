import { motion } from "framer-motion";
import { useId } from "react";

export interface SectionNavItem<T extends string> {
  id: T;
  label: string;
}

interface SectionNavProps<T extends string> {
  items: readonly SectionNavItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}

export function SectionNav<T extends string>({ items, activeId, onChange, ariaLabel }: SectionNavProps<T>) {
  const indicatorId = useId();

  return (
    <nav aria-label={ariaLabel} className="sticky top-3 z-10 flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-surface/95 p-1.5 shadow-panel backdrop-blur">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(item.id)}
            className={`relative shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "text-white" : "text-textMuted hover:bg-surfaceAlt hover:text-text"}`}
          >
            {isActive ? <motion.span layoutId={indicatorId} className="absolute inset-0 rounded-xl bg-[color:var(--accent)] shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 32 }} /> : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
