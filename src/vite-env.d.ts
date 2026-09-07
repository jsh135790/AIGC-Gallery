/// <reference types="vite/client" />

/** vite.config.ts 的 define 注入,取自 package.json 的 version */
declare const __APP_VERSION__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'png-chunks-extract' {
  function extractChunks(data: Uint8Array): Array<{ name: string; data: Uint8Array }>
  export default extractChunks
}
