/**
 * 统一埋点：对外只暴露 track(event, props?)。
 * 可在此处接入 gtag、Mixpanel、自建上报等，默认仅 console（开发时可看）。
 */
export type AnalyticsEvent =
  | "resume_analysis_complete"
  | "mock_interview_deck_created"
  | "mock_interview_card_flip"
  | "agenda_task_created";

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  const payload = { event, ...props };

  if (typeof window === "undefined") return;

  if (window.gtag) {
    window.gtag("event", event, payload);
  }

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, props: props ?? {} }),
    keepalive: true,
  }).catch(() => {});

  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", payload);
  }
}
