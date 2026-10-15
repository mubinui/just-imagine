import { z } from 'zod';

export const DocumentIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^(?!\.{1,2}$)[^/\s]+$/);
export const EpochMsSchema = z.number().int().nonnegative();
export const DateKeySchema = z
  .string()
  .regex(/^\d{8}$/)
  .refine((key) => {
    const date = new Date(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10).replaceAll('-', '') === key
    );
  }, 'expected a valid UTC calendar date in YYYYMMDD form');
