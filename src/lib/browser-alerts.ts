let titleResetTimeout: number | null = null;

export async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported" as const;
  if (Notification.permission === "default") return Notification.requestPermission();
  return Notification.permission;
}

export function pingBrowserTab(label: string) {
  const originalTitle = "Nebula Social";
  if (titleResetTimeout) window.clearTimeout(titleResetTimeout);
  document.title = `(${label}) ${originalTitle}`;
  titleResetTimeout = window.setTimeout(() => { document.title = originalTitle; titleResetTimeout = null; }, 6000);
}

export function sendBrowserAlert(title: string, body: string) {
  pingBrowserTab("New");
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico" });
}
