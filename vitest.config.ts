import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import { createRequire } from 'node:module'

const { version } = createRequire(import.meta.url)('./package.json') as { version: string }

export default defineConfig({
  define: {
    // png-writer 把版本号写进编辑痕迹 chunk,测试里也得有,否则一 import 就 ReferenceError
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 解析层与写入层都只用 File / Blob / TextDecoder,不碰 DOM,所以 node 环境足够。
    // 真正需要 canvas 的只有 extractStealthPng 和 generateThumbnail,测试不覆盖它们。
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
