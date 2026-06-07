import eslintPluginPrettier from "eslint-plugin-prettier";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs"
    },
    plugins: {
      prettier: eslintPluginPrettier
    },
    rules: {
      "prettier/prettier": "error"
    }
  }
];
