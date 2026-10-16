import { brandContents } from '../lib/brand';
/** Dream Launch uses the active theme. The core star/cloud identity is preserved. */
export function Mark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: brandContents() }}
    />
  );
}
