import type { CharacterId } from '@just-imagine/protocol';
import { Actor } from '../acting/Actor';

/** Preset friends share the registered Tooth Town acting standard on every surface. */
export function CharacterArt({
  id,
  title,
  action,
}: {
  id: CharacterId;
  title?: string;
  action?: string;
}) {
  return (
    <svg
      className="char-art"
      viewBox="0 0 100 100"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <Actor id={id} action={action} />
    </svg>
  );
}
