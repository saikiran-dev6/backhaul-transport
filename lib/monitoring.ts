import { getRequestId } from "@/lib/correlation";

type MetricValue = { count: number; lastUpdated: string };
const metricsStore = new Map<string, MetricValue>();

export function trackMetric(metricName: string, increment: number = 1): void {
  const current = metricsStore.get(metricName) || { count: 0, lastUpdated: new Date().toISOString() };
  metricsStore.set(metricName, {
    count: current.count + increment,
    lastUpdated: new Date().toISOString(),
  });
}

export function getMetricsSnapshot(): Record<string, { count: number; lastUpdated: string }> {
  const snapshot: Record<string, { count: number; lastUpdated: string }> = {};
  metricsStore.forEach((val, key) => {
    snapshot[key] = { ...val };
  });
  return snapshot;
}

export function captureException(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const reqId = context?.request ? getRequestId(context.request) : "N/A";
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Structured production console log (never includes secrets/PII)
  console.error(
    JSON.stringify({
      level: "ERROR",
      timestamp,
      requestId: reqId,
      error: errorMessage,
      stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      route: context?.route || "unknown",
    })
  );

  trackMetric("http_errors_total", 1);
}
