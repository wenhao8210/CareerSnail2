import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["node_modules", ".next"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // ✅ 禁用严格类型错误（就是那些 any 报错）
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
