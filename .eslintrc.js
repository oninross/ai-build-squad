module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["prettier", "import", "@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
    "plugin:import/typescript",
  ],
  rules: {
    "prettier/prettier": [
      "error",
      {
        semi: true,
        singleQuote: false,
        endOfLine: "lf",
        tabWidth: 2,
        bracketSpacing: true,
        printWidth: 100,
        trailingComma: "es5",
      },
    ],
    "import/order": [
      "error",
      {
        groups: [
          ["builtin"],
          ["external"],
          ["internal"],
          ["parent", "sibling", "index"],
          ["object", "type"],
          ["unknown"],
        ],
        pathGroups: [
          {
            pattern: "@/**",
            group: "internal",
            position: "after",
          },
        ],
        pathGroupsExcludedImportTypes: ["builtin"],
        alphabetize: { order: "asc", caseInsensitive: true },
        "newlines-between": "always",
        warnOnUnassignedImports: true,
      },
    ],
    "import/newline-after-import": ["error", { count: 1 }],
    "import/no-duplicates": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      { allowExpressions: true, allowTypedFunctionExpressions: true },
    ],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/strict-boolean-expressions": "error",
  },
};
