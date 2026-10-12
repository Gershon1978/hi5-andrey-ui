/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AR_MOCK?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
