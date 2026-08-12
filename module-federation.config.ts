import { createModuleFederationConfig } from "@module-federation/vite";
import pkg from "./package.json" with { type: "json" };

const { dependencies } = pkg;

export default createModuleFederationConfig({
  name: "planning-poker",
  filename: "remoteEntry.js",
  exposes: {
    "./RemoteAppEntry": "./src/RemoteAppEntry.tsx",
  },
  manifest: true,
  dts: true,
  shared: {
    "react": { singleton: true, requiredVersion: dependencies["react"] },
    "react-dom": { singleton: true, requiredVersion: dependencies["react-dom"] },
    "react-router-dom": { singleton: true, requiredVersion: dependencies["react-router-dom"] },
  },
});
