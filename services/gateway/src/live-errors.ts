/** Classify only allowlisted operational details; never log provider message bodies. */
export function liveErrorDetails(error: unknown): { status?: number; milestone: string } {
  const value =
    error && typeof error === 'object'
      ? (error as { status?: unknown; code?: unknown; message?: unknown })
      : {};
  const numeric = Number(value.status ?? value.code);
  const status =
    Number.isInteger(numeric) && numeric >= 100 && numeric <= 599 ? numeric : undefined;
  const message = typeof value.message === 'string' ? value.message : '';
  const milestone =
    status === 401 || status === 403 || /credential|permission|unauthenticated/i.test(message)
      ? 'check_adc_and_iam'
      : status === 400 || /invalid.argument|schema/i.test(message)
        ? 'check_model_and_schema'
        : status === 404
          ? 'check_model_and_region'
          : status === 429
            ? 'check_vertex_quota'
            : /timeout|deadline/i.test(message)
              ? 'vertex_timeout'
              : 'vertex_connection_failed';
  return { ...(status ? { status } : {}), milestone };
}
