import { Actor } from '../acting/Actor';
export const PET_ORDER = [
  'tuktuk',
  'chiku',
  'bubbli',
  'meghla',
  'tara',
  'golu',
  'jhilmil',
  'dhumketu',
] as const;
/** Locked silhouettes stay still; unlocked pets react with species-appropriate poses. */
export function PetArt({
  id,
  title,
  locked = false,
  action,
}: {
  id: string;
  title?: string;
  locked?: boolean;
  action?: string;
}) {
  if (!(PET_ORDER as readonly string[]).includes(id)) return null;
  return (
    <svg
      className={locked ? 'char-art pet-art is-locked' : 'char-art pet-art'}
      viewBox="0 0 100 100"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <Actor id={id} action={locked ? 'still' : action} />
    </svg>
  );
}
