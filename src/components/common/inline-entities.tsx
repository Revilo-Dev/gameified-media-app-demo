import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { subscribeToUserProfileByHandle } from "@/firebase/users";
import type { UserProfile } from "@/types/models";
import { getProfileCardStyle } from "@/constants/profile-cards";

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
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="font-semibold text-[color:var(--accent)]"
        onClick={() => {
          if (onClick) {
            onClick(value);
            return;
          }
          setOpen(true);
        }}
      >
        {value}
      </button>
      {open && profile ? (
        <button type="button" onClick={() => navigate(`/profile/${handle}`)} className="absolute left-0 top-6 z-20 min-w-52 rounded-2xl border border-border p-3 text-left shadow-panel hover:brightness-110" style={{ background: getProfileCardStyle(profile.equippedProfileCardId).background, color: getProfileCardStyle(profile.equippedProfileCardId).text }}>
          <span className="block text-sm font-semibold">{profile.displayName}</span>
          <span className="block text-xs" style={{ color: getProfileCardStyle(profile.equippedProfileCardId).mutedText }}>{`@${profile.handle}`}</span>
          <span className="mt-2 block text-xs" style={{ color: getProfileCardStyle(profile.equippedProfileCardId).mutedText }}>{profile.bio}</span>
        </button>
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
    <span className={cn("whitespace-pre-wrap break-words [overflow-wrap:anywhere]", className)}>
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
