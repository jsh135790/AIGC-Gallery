import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'

// 版本号写进导出 PNG 的编辑痕迹 chunk,得跟 package.json 走而不是手抄一份
const { version } = createRequire(import.meta.url)('./package.json') as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    vue(),
    tailwindcss(),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  /*
   * 端口必须锁死。IndexedDB / localStorage 都按 origin(含端口)隔离,vite 默认
   * 在 5173 被占时静默递增到 5174 —— 那是一个全新 origin,库看起来是空的,像丢了
   * 全部数据。strictPort 让第二个实例直接报冲突退出,而不是给出一个空库。
   * 真要同时跑两份:npm run dev -- --port 5180
   */
  server: {
    port: 5173,
    strictPort: true,
  },
  base: './',
})
