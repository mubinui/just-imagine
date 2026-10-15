import { createHash } from 'node:crypto';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
export type TelemetryFields = {
  sessionId?: string;
  worldId?: string;
  jobId?: string;
  childHash?: string;
  milestone?: string;
  durationMs?: number;
  count?: number;
  success?: boolean;
  cached?: boolean;
  service?: string;
  status?: number;
};
export function childHash(uid: string, childId: string) {
  return createHash('sha256')
    .update(JSON.stringify([uid, childId]))
    .digest('hex')
    .slice(0, 24);
}
/** Accept only operational fields. Never pass transcripts, prompts, tokens or child names. */
export function logEvent(
  event: string,
  fields: TelemetryFields = {},
  severity: 'INFO' | 'WARNING' | 'ERROR' = 'INFO',
) {
  if (process.env['NODE_ENV'] === 'test') return;
  process.stdout.write(
    JSON.stringify({ severity, event, service: process.env['K_SERVICE'] ?? 'local', ...fields }) +
      '\n',
  );
}
export async function traced<T>(
  name: string,
  fields: TelemetryFields,
  operation: () => Promise<T>,
): Promise<T> {
  return trace.getTracer('just-imagine').startActiveSpan(name, async (span) => {
    const start = Date.now();
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      logEvent(name, { ...fields, success: true, durationMs: Date.now() - start });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      logEvent(name, { ...fields, success: false, durationMs: Date.now() - start }, 'ERROR');
      throw error;
    } finally {
      span.end();
    }
  });
}
export function startTelemetry(service: string) {
  if (process.env['OTEL_ENABLED'] !== '1') return async () => {};
  const sdk = new NodeSDK({ serviceName: service, traceExporter: new TraceExporter() });
  sdk.start();
  return () => sdk.shutdown();
}
