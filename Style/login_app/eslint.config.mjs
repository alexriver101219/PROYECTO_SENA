export default [
  {
    ignores: ["build/**", "node_modules/**"]
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {},
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];
