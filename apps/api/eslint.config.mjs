import baseConfig from '../../eslint.config.base.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];
