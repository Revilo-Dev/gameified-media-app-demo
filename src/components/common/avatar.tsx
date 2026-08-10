import { getProfileBorderStyle } from "@/constants/profile-borders";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  borderId?: string | null;
  disableBorder?: boolean;
  disableBorderAnimation?: boolean;
}

export function Avatar({ name, src, className, borderId, disableBorder = false, disableBorderAnimation = false }: AvatarProps) {
  const rawBorderStyle = !disableBorder && borderId ? getProfileBorderStyle(borderId) : null;
  const borderOptionStyle = rawBorderStyle && disableBorderAnimation
    ? { ...rawBorderStyle, animation: undefined, transform: undefined, filter: undefined, boxShadow: undefined }
    : rawBorderStyle;

  if (borderOptionStyle) {
    return (
      <div className="inline-flex h-fit w-fit shrink-0 rounded-[1.1rem] p-[3px]" style={borderOptionStyle}>
        {src ? (
          <img src={src} alt={name} loading="eager" decoding="async" fetchPriority="high" className={cn("h-11 w-11 rounded-2xl object-cover bg-canvas", className)} />
        ) : (
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-surfaceAlt text-sm font-bold", className)}>
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    );
  }

  if (src) {
    return <img src={src} alt={name} loading="eager" decoding="async" fetchPriority="high" className={cn("h-11 w-11 rounded-2xl object-cover", className)} />;
  }

  return (
    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-surfaceAlt text-sm font-bold", className)}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
