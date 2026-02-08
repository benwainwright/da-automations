import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./src/test-helpers/test-setup.ts",
    globals: true,
    include: ["./src/**/*"],
  },
});
