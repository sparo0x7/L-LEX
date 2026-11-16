import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'content/', 'node_modules/', 'fix_ar.js', 'fix_ar.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
