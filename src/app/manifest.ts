import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mandarin Learning Dashboard',
    short_name: 'Mandarin OS',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f5f7fa',
    theme_color: '#0f766e',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
