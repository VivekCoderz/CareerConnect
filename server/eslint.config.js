const js = require("@eslint/js");
const globals = require("globals");
const { defineConfig, globalIgnores } = require("eslint/config");

module.exports = defineConfig([
  globalIgnores(["node_modules", "coverage", "uploads"]),
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      // Keep files small enough to review. Existing large files are listed in
      // eslint-suppressions.json; new files must stay under this limit.
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["__tests__/**/*.js", "jest.setup.js"],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
]);
