export default [
  {
    ignores: ["examples/**", "demo/**", "node_modules/**", "_site/**"],
  },
  {
    files: ["src/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        Element: "readonly",
        HTMLElement: "readonly",
        Node: "readonly",
        getComputedStyle: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        Promise: "readonly",
        URL: "readonly",
        Notification: "readonly",
        AudioContext: "readonly",
        globalThis: "readonly",
        process: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^shakeCalls$",
          caughtErrors: "none",
        },
      ],
    },
  },
];
