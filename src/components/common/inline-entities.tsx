import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { subscribeToUserProfileByHandle } from "@/firebase/users";
import type { UserProfile } from "@/types/models";

const ENTITY_PATTERN = /(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g;

function MentionEntity({
  value,
  onClick,
}: {
  value: string;
  onClick?: (value: string) => void;
}) {
  const handle = value.slice(1).toLowerCase();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      return;
    }

    return subscribeToUserProfileByHandle(handle, setProfile);
  }, [handle, open]);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="font-semibold text-[color:var(--accent)]"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => {
          if (onClick) {
            onClick(value);
            return;
          }

          navigate(`/profile/${handle}`);
        }}
      >
        {value}
      </button>
      {open && profile ? (
        <span className="absolute left-0 top-6 z-20 min-w-52 rounded-2xl border border-border bg-canvas p-3 text-left shadow-panel">
          <span className="block text-sm font-semibold text-text">{profile.displayName}</span>
          <span className="block text-xs text-textMuted">@{profile.handle}</span>
          <span className="mt-2 block text-xs text-textMuted">{profile.bio}</span>
        </span>
      ) : null}
    </span>
  );
}

export function InlineEntities({
  text,
  className,
  onMentionClick,
  onHashtagClick,
}: {
  text: string;
  className?: string;
  onMentionClick?: (value: string) => void;
  onHashtagClick?: (value: string) => void;
}) {
  const navigate = useNavigate();
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

        if (part.startsWith("@")) {
          return <MentionEntity key={`${part}-${index}`} value={part} onClick={onMentionClick} />;
        }

        if (onHashtagClick) {
          return (
            <button
              key={`${part}-${index}`}
              type="button"
              className="font-semibold text-[color:var(--accent)]"
              onClick={() => onHashtagClick(part)}
            >
              {part}
            </button>
          );
        }

        return (
          <button
            key={`${part}-${index}`}
            type="button"
            className="font-semibold text-[color:var(--accent)]"
            onClick={() => navigate(`/explore?query=${encodeURIComponent(part)}`)}
          >
            {part}
          </button>
        );
      })}
    </span>
  );
}
