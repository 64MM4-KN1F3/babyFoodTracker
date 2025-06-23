import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  envDir: '../', // <-- Add this line to point to the project root for .env files
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        main: 'src/index.html',
      },
    },
  },
  server: {
    open: '/index.html',
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.googleapis.com https://securetoken.googleapis.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; frame-src 'self' https://apis.google.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://www.google.com data: https://lh3.googleusercontent.com;"
    }
  },
});