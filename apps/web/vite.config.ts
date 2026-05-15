import { tanstackRouterGenerator } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 3333
  },
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    // Use the generator only — not the full `tanstackRouter()` composed plugin. The composed
    // plugin adds route-file HMR transforms that can emit duplicate `const hot` (Babel scope
    // collision) for routes with both `beforeLoad` and `component`, especially under TanStack Start.
    tanstackRouterGenerator({
      target: "react",
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts"
    }),
    tanstackStart({ srcDirectory: "src" }),
    viteReact(),
    nitro()
  ]
});
