/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENTIVITY_BASE_URL?: string;
  readonly VITE_COACH_TEAM_ID?: string;
  /** A key for a web page (agp_…), on a workspace that asks to sign in. Never a secret key (agv_…). */
  readonly VITE_AGENTIVITY_API_KEY?: string;
}

declare module 'three/addons/loaders/GLTFLoader.js';
