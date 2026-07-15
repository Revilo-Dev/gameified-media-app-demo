import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
  if (src) {
    return <img src={src} alt={name} className={cn("h-11 w-11 rounded-2xl object-cover", className)} />;
  }

  return (
    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-surfaceAlt text-sm font-bold", className)}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
