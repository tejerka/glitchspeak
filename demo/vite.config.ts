import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = (file: string) => path.resolve(import.meta.dirname, file);

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@tejerka\/glitchspeak\/style\.css$/, replacement: root("../core/style.css") },
      { find: /^@tejerka\/glitchspeak-react$/, replacement: root("../react/src/index.ts") },
      { find: /^@tejerka\/glitchspeak$/, replacement: root("../core/src/index.ts") },
    ],
    // The lib is read straight from ../core/src and ../react/src, so its imports resolve against
    // the root node_modules — without this the demo would load a second copy of React.
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      input: {
        main: root("index.html"),
        embed: root("embed/index.html"),
      },
    },
  },
});
