import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";

// Flat-config equivalent of the previous .eslintrc.js:
//   extends: ["eslint:recommended", "plugin:@typescript-eslint/eslint-recommended", "plugin:@typescript-eslint/recommended"]
//   rules: { "@typescript-eslint/no-use-before-define": "off", "@typescript-eslint/explicit-function-return-type": "off" }
export default [
  {
    // Equivalent of the previous .eslintignore (bare names there matched at any
    // depth, which is what kept build outputs like test/chrome/js out of scope)
    ignores: [
      "**/node_modules/**",
      "**/js/**",
      "**/firefox/**",
      "**/chrome/**",
      "edge/**",
      "**/scripts/**",
      "webpack.config.js",
      "webpack.prod.js",
      "webpack.dev.js",
      "webpack.watch.js",
      "src/test/**",
      "src/models/credentials.ts",
      "docs/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs["flat/recommended"],
  {
    rules: {
      // New eslint 10 core recommended rules; off to keep this migration
      // behavior-equivalent to the eslint 8 baseline. Tighten separately.
      "no-useless-assignment": "off",
      "preserve-caught-error": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    rules: {
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      // Entered typescript-eslint recommended in v8 (or changed defaults);
      // aligned to the v7 baseline. Tighten separately if desired.
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": ["error", { caughtErrors: "none" }],
    },
  },
];
