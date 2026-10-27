import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import hdBackend from '@hyperdart/backend';
import config from './hyperdart.config.js';
import sandboxSocialPlugin, { sandboxDependencies } from './scripts/sandbox-social-plugin.js';

function dartFrame() {
  return {
    name: 'hyperdart-frame',
    configureServer(server) {
      server.middlewares.use(config.client.baseURL, async (req, res, next) => {
        try {
          const frame = await hdBackend.createDartFrame({ ...config, client: { ...config.client, location: '/src/frontend/index.jsx' } }, null);
          res.setHeader('Content-Type', 'text/html');
          res.end(await server.transformIndexHtml(req.originalUrl, frame));
        } catch (error) { next(error); }
      });
    }
  };
}
export default defineConfig(({ command }) => ({
  plugins: [sandboxSocialPlugin(), react(), dartFrame(), cssInjectedByJsPlugin()],
  optimizeDeps: { exclude: ['@hyperdart/sandbox'], include: ['@mui/material', '@hyperdart/frontend', ...sandboxDependencies()] },
  define: { 'process.env.NODE_ENV': JSON.stringify(command === 'build' ? 'production' : 'development') },
  server: { proxy: {
    '/nodeapi': { target: 'https://dev.hyperdart.com', changeOrigin: true },
    '/c': { target: 'https://dev.hyperdart.com', changeOrigin: true }
  } },
  build: {
    outDir: 'dist/frontend',
    lib: { entry: 'src/frontend/index.jsx', name: 'HDPackageLens', formats: ['es'], fileName: () => 'index.modern.js' }
  }
}));
