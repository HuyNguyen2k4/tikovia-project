import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'build', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // Nếu bạn có dùng biến môi trường của Vite:
        // 'import.meta': 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Ít ồn hơn cho biến thừa:
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(React|_|[A-Z_])',
          ignoreRestSiblings: true,
        },
      ],

      // Giảm ồn khi debug/dev:
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'off',

      // Giảm “khó chịu” của react-refresh:
      'react-refresh/only-export-components': 'off',

      // Hook deps vẫn nhắc nhưng không fail:
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@src', './src'],
            ['@assets', './src/assets'],
            ['@components', './src/components'],
            ['@configs', './src/configs'],
            ['@contexts', './src/contexts'],
            ['@hooks', './src/hooks'],
            ['@pages', './src/pages'],
            ['@routes', './src/routes'],
            ['@services', './src/services'],
            ['@utils', './src/utils'],
          ],
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
  },

  // Giảm ồn trong test
  {
    files: ['**/*.{test,spec}.{js,jsx}', '**/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.jest, ...globals.browser },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
])

// import js from '@eslint/js'
// import globals from 'globals'
// import reactHooks from 'eslint-plugin-react-hooks'
// import reactRefresh from 'eslint-plugin-react-refresh'
// import { defineConfig, globalIgnores } from 'eslint/config'

// export default defineConfig([
//   globalIgnores(['dist']),
//   {
//     files: ['**/*.{js,jsx}'],
//     extends: [
//       js.configs.recommended,
//       reactHooks.configs['recommended-latest'],
//       reactRefresh.configs.vite,
//     ],
//     languageOptions: {
//       ecmaVersion: 2020,
//       globals: globals.browser,
//       parserOptions: {
//         ecmaVersion: 'latest',
//         ecmaFeatures: { jsx: true },
//         sourceType: 'module',
//       },
//     },
//     rules: {
//       'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
//     },
//     settings: {
//       'import/resolver': {
//         alias: {
//           map: [
//             ['@src', './src'],
//             ['@assets', './src/assets'],
//             ['@components', './src/components'],
//             ['@configs', './src/configs'],
//             ['@contexts', './src/contexts'],
//             ['@hooks', './src/hooks'],
//             ['@pages', './src/pages'],
//             ['@routes', './src/routes'],
//             ['@services', './src/services'],
//             ['@utils', './src/utils'],
//           ],
//           extensions: ['.js', '.jsx', '.ts', '.tsx'],
//         },
//       },
//     },
//   },
// ])
