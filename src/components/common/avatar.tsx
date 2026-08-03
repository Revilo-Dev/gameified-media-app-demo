import { getProfileBorderStyle } from "@/constants/profile-borders";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  borderId?: string | null;
}

export function Avatar({ name, src, className, borderId }: AvatarProps) {
  const borderOptionStyle = borderId ? getProfileBorderStyle(borderId) : null;

  if (borderOptionStyle) {
    return (
      <div className="inline-flex rounded-[1.1rem] p-[3px]" style={borderOptionStyle}>
        {src ? (
          <img src={src} alt={name} className={cn("h-11 w-11 rounded-2xl object-cover bg-canvas", className)} />
        ) : (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-surfaceAlt text-sm font-bold", className)}>
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  if (src) {
    return <img src={src} alt={name} className={cn("h-11 w-11 rounded-2xl object-cover", className)} />;
  }

  return (
    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-surfaceAlt text-sm font-bold", className)}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
