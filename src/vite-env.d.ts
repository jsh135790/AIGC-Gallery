/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'png-chunks-extract' {
  function extractChunks(data: Uint8Array): Array<{ name: string; data: Uint8Array }>
  export default extractChunks
}

declare module 'png-chunk-text' {
  export function decode(data: Uint8Array): { keyword: string; text: string }
  export function encode(keyword: string, text: string): { name: string; data: Uint8Array }
}
