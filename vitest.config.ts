import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,

    setupFiles: ["./vitest.setup.ts"],

    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      exclude: ["node_modules/", "test/", "dist/"],
    },

    typecheck: {
      tsconfig: "./tsconfig.vitest.json",
    },

    poolOptions: {
      forks: {
        execArgv: ["--expose-gc"],
      },
    },
  },
});
