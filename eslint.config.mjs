/* eslint-disable import/no-unresolved */
import jest from 'eslint-plugin-jest';
import globals from 'globals';
import github from 'eslint-plugin-github';

import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

import typescriptParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';

export default [
  github.getFlatConfigs().recommended,
  prettier,
  {
    ignores: [
      '**/dist/',
      '**/lib/',
      '**/node_modules/',
      '**/jest.config.js',
      '**/__tests__/'
    ]
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...jest.environments.globals.globals
      },
      ecmaVersion: 'latest'
    }
  },
  {
    rules: {
      'prettier/prettier': [
        'error',
        {
          trailingComma: 'none',
          singleQuote: true,
          printWidth: 80,
          // below line only for windows users facing CLRF and eslint/prettier error
          // non windows users feel free to delete it
          endOfLine: 'auto',
          useTabs: false
        }
      ],
      'eslint-comments/no-use': 'off',
      'import/no-namespace': 'off',
      camelcase: 'off',
      'i18n-text/no-en': 'off',
      'no-unused-vars': 'off'
    },
    plugins: {
      prettier: prettierPlugin
    }
  },
  {
    files: ['**/*.mjs'],
    rules: {}
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {}
  }
];
