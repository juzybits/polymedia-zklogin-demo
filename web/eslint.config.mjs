import { fixupConfigRules } from "@eslint/compat";
import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import eslintPluginImport from "eslint-plugin-import";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import unusedImports from "eslint-plugin-unused-imports";
import tsEslint from "typescript-eslint";

export default [
    eslint.configs.recommended,
    ...tsEslint.configs.strictTypeChecked,
    ...tsEslint.configs.stylisticTypeChecked,
    ...fixupConfigRules(pluginReactConfig),
    {
        ignores: [ "**/dist", "**/node_modules" ],
    },
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                project: [ "./tsconfig.json" ],
            },
        },
        plugins: {
            "@stylistic": stylistic,
            import: eslintPluginImport,
            "unused-imports": unusedImports,
        },
        rules: {
            // === stylistic ===
            "@stylistic/jsx-quotes": [ "error", "prefer-double" ],
            "@stylistic/member-delimiter-style": [ "error", { multiline: { delimiter: "semi" }, singleline: { delimiter: "semi" } } ],
            "@stylistic/no-tabs": "error",
            "@stylistic/quotes": [ "error", "double", { avoidEscape: true } ],
            "@stylistic/semi": [ "error", "always" ],

            // === imports ===
            // "import/extensions": ["error", "ignorePackages", { ts: "never", tsx: "never" }], // require .js
            "import/first": "error",
            "import/newline-after-import": "error",
            "import/no-duplicates": "error",
            "import/order": ["error", {
                "groups": [
                    "builtin", // Node.js built-in modules (fs, path, etc.)
                    "external", // npm packages
                    ["internal", "parent", "sibling", "index"] // project imports (aliased + relative)
                ],
                "pathGroups": [
                    {
                        "pattern": "nexus-launchpad-sdk",
                        "group": "external",
                        "position": "after",
                    }
                ],
                "pathGroupsExcludedImportTypes": ["builtin"],
                "newlines-between": "always",
                "alphabetize": {
                    "order": "asc",
                    "caseInsensitive": true,
                }
            }],
            "unused-imports/no-unused-imports": "error",

            // === typescript ===
            "@typescript-eslint/consistent-type-definitions": [ "error", "type" ],
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-inferrable-types": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unnecessary-type-parameters": "off",
            "@typescript-eslint/no-unused-expressions": [ "error", { allowShortCircuit: true, allowTernary: true } ],
            "@typescript-eslint/no-unused-vars": [ "error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" } ],
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",

            // === general ===
            "no-constant-condition": "off",

            // === react ===
            "react/display-name": "off",
            "react/no-unescaped-entities": "off",
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",

            // Chill with the any checks
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
        },
        settings: {
            react: {
                version: "18"
            }
        },
    },
    {
        files: ["**/__tests__/**/*.ts?(x)", "src/web/src/**/*.ts?(x)", "src/react/src/**/*.ts?(x)"],
        rules: {
            "import/extensions": ["off", "ignorePackages"], // don't require .js
        },
    },
];
