import { it, expect } from 'vitest';
import { liveErrorDetails } from '../src/live-errors';
import { toolDeclarations } from '../src/tools';
it('logs actionable allowlisted categories without provider messages or credentials', () => {
  const error = {
    status: 403,
    message: 'secret-token child private transcript',
    token: 'secret-token',
  };
  expect(liveErrorDetails(error)).toEqual({ status: 403, milestone: 'check_adc_and_iam' });
  expect(JSON.stringify(liveErrorDetails(error))).not.toContain('secret');
});
it('sanitizes all Live tool schemas and explains their semantics', () => {
  for (const tool of toolDeclarations) {
    expect(tool.description.length).toBeGreaterThan(40);
    expect(JSON.stringify(tool.parametersJsonSchema)).not.toMatch(
      /"(\$schema|additionalProperties|const|pattern|minLength|maxLength)":/,
    );
  }
});
