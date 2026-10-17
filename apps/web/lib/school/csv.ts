import { StudentUsernameSchema } from '@just-imagine/protocol';
export type CsvIssue = {
  row: number;
  code:
    'columns' | 'quote' | 'missing' | 'invalidUsername' | 'duplicate' | 'unknownClass' | 'seats';
};
export type CsvPreview = {
  rows: { firstName: string; username: string; classId: string }[];
  issues: CsvIssue[];
};
export function previewRosterCsv(
  csv: string,
  classIds: readonly string[],
  availableSeats = Infinity,
): CsvPreview {
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]!;
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (quoted) return { rows: [], issues: [{ row: rows.length + 1, code: 'quote' }] };
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  const header = rows.shift()?.map((v) => v.replace(/^\uFEFF/, '')) ?? [];
  if (!['firstName', 'username', 'classId'].every((k) => header.includes(k)))
    return { rows: [], issues: [{ row: 1, code: 'columns' }] };
  const issues: CsvIssue[] = [],
    seen = new Set<string>();
  const entries = rows.map((values, index) => {
    const data = Object.fromEntries(header.map((h, i) => [h, values[i] ?? '']));
    const result = {
      firstName: data.firstName ?? '',
      username: (data.username ?? '').toLowerCase(),
      classId: data.classId ?? '',
    };
    const n = index + 2;
    if (!result.firstName || !result.username || !result.classId)
      issues.push({ row: n, code: 'missing' });
    if (!StudentUsernameSchema.safeParse(result.username).success)
      issues.push({ row: n, code: 'invalidUsername' });
    if (seen.has(result.username)) issues.push({ row: n, code: 'duplicate' });
    seen.add(result.username);
    if (!classIds.includes(result.classId)) issues.push({ row: n, code: 'unknownClass' });
    return result;
  });
  if (entries.length > availableSeats) issues.push({ row: 0, code: 'seats' });
  return { rows: entries, issues };
}
