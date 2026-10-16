import base from '@just-imagine/config/eslint';

export default [
  ...base,
  // Red-team scripts are hostile sandbox inputs by design; they are tested, not linted.
  { ignores: ['test/red-team/**'] },
  // Example games run inside the sandbox, where only the Game API globals exist.
  {
    files: ['test/examples/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { game: 'readonly', console: 'readonly' },
    },
  },
];
