import { defineConfig } from 'vite'

export default defineConfig(async () => {
  const reactPlugin = (await import('@vitejs/plugin-react')).default
  return {
    plugins: [reactPlugin()],
    root: '.',
    optimizeDeps: {
      exclude: ['molstar'],
    },
    resolve: {
      alias: {
        // molstar imports the CJS build of mutative by direct path; redirect to ESM
        'mutative/dist/index.js': 'mutative/dist/mutative.esm.mjs',
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
