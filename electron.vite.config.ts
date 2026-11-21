import { resolve } from 'path'
import type { Plugin } from 'vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

const productionContentSecurityPolicy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'"

const cspInjectionPlugin = (): Plugin | null => {
  const shouldEnableCSP =
    process.env.NODE_ENV === 'production' || process.env.ELECTRON_IS_PACKAGED === 'true'
  if (!shouldEnableCSP) {
    return null
  }
  return {
    name: 'csp-injection',
    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `<!-- Production CSP meta tag injected by Vite plugin -->
  <meta http-equiv="Content-Security-Policy" content="${productionContentSecurityPolicy}">
</head>`
      )
    }
  }
}

delete process.env.ELECTRON_RUN_AS_NODE

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          worker: resolve('src/main/worker.ts')
        }
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    build: {
      externalizeDeps: false,
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [
      TanStackRouterVite({
        routesDirectory: resolve('src/renderer/src/routes'),
        generatedRouteTree: resolve('src/renderer/src/routeTree.gen.ts')
      }),
      react(),
      cspInjectionPlugin(),
      tailwindcss()
    ]
  }
})
