import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 读取 .env.local（含不带 VITE_ 前缀的服务端变量，如 DEEPSEEK_API_KEY）
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // GitHub Pages 部署在 https://qwq2008123-star.github.io/portfolio/ 子路径下
    // 生产构建的资源路径必须带 /portfolio/ 前缀；本地开发保持根路径
    base: mode === "production" ? "/portfolio/" : "/",
    plugins: [react()],
    server: {
      proxy: env.DEEPSEEK_API_KEY
        ? {
            // 浏览器 → /deepseek/* → https://api.deepseek.com/*
            // Key 只存在于 dev server 侧，避免进入前端产物
            '/deepseek': {
              target: 'https://api.deepseek.com',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/deepseek/, ''),
              headers: {
                Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
              },
            },
          }
        : undefined,
    },
  }
})
