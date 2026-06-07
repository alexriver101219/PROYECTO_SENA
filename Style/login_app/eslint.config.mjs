import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default [
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    plugins: {
      react: eslintPluginReact,
      "react-hooks": eslintPluginReactHooks,
      prettier: eslintPluginPrettier
    },
    rules: {
      "react/react-in-jsx-scope": "off", // no es necesario en React 17+
      "react-hooks/rules-of-hooks": "error", // valida uso correcto de hooks
      "react-hooks/exhaustive-deps": "warn", // avisa dependencias faltantes en useEffect
      "prettier/prettier": "error"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];
