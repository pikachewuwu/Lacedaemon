/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// SINGLE=1 builds one self-contained HTML file (used for hosted previews).
export default defineConfig({
  plugins: process.env.SINGLE ? [react(), viteSingleFile()] : [react()],
  base: "./",
  test: { environment: "node" },
});
