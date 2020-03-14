module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
       "ecmaVersion": 6
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    "amd": true,
    "node": true  
  }
};
