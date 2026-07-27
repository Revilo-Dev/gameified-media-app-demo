import { cn } from "@/lib/utils";

const ENTITY_PATTERN = /(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g;

export function InlineEntities({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(ENTITY_PATTERN);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }

        const isEntity = ENTITY_PATTERN.test(part);
        ENTITY_PATTERN.lastIndex = 0;

        if (!isEntity) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        return (
          <span key={`${part}-${index}`} className="font-semibold text-[color:var(--accent)]">
            {part}
          </span>
        );
      })}
    </span>
  );
}
