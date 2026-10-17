import type { SVGProps } from 'react';
import { PHOSPHOR_CONTENTS } from './icons/phosphor';

/** Shared 2D duotone controls; character and scientific artwork stay separate. */
export const UI_PATHS = PHOSPHOR_CONTENTS;
export type UiIconName = keyof typeof UI_PATHS;
export function UiIcon({
  name,
  className,
  style,
  ...props
}: { name: UiIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
      {...props}
      className={className ? `ui-icon ${className}` : 'ui-icon'}
      viewBox="0 0 256 256"
      fill="currentColor"
      stroke="none"
      style={{ ...style, fill: 'currentColor', stroke: 'none' }}
      dangerouslySetInnerHTML={{ __html: UI_PATHS[name] }}
    />
  );
}
