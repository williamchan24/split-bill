import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // './' = relative paths, so the built app works in ANY folder,
  // e.g. williamchanwinghong.com/projects/split-bill/
  base: './',
});
