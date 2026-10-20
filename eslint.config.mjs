import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/declarations/**', '**/node_modules/**', '**/.pnpm-store/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
