import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // The SDK is linked from a sibling folder (`file:../agentivity_sdk_react`), outside this project's root: the dev
      // server must be allowed to serve its files (the icon font its stylesheet points at), or the icons render as boxes.
      allow: [searchForWorkspaceRoot(process.cwd()), '../agentivity_sdk_react'],
    },
  },
})
