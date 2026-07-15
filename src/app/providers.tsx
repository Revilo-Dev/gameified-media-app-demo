import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/app/queryClient";
import { useThemeSync } from "@/hooks/use-theme-sync";
import type { PropsWithChildren } from "react";

function ThemeBridge({ children }: PropsWithChildren) {
  useThemeSync();
  return children;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBridge>
        {children}
        <Toaster richColors position="top-right" />
      </ThemeBridge>
    </QueryClientProvider>
  );
}
