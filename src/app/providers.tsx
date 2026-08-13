import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/app/queryClient";
import { AuthProvider } from "@/app/auth-provider";
import { useThemeSync } from "@/hooks/use-theme-sync";
import type { PropsWithChildren } from "react";

function ThemeBridge({ children }: PropsWithChildren) {
  useThemeSync();
  return children;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeBridge>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: "border border-border bg-surface text-text shadow-panel",
                title: "text-text font-semibold",
                description: "text-textMuted",
                actionButton: "bg-accent text-white",
                cancelButton: "bg-surfaceAlt text-text",
              },
            }}
          />
        </ThemeBridge>
      </AuthProvider>
    </QueryClientProvider>
  );
}
