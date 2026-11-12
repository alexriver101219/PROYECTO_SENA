import js from "@eslint/js";
import globals from "globals";
export default [
  { ignores: ["node_modules/**", ".legacy_node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  { files: ["**/*.mjs"], languageOptions: { sourceType: "module" } },
];
