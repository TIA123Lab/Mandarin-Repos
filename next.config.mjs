/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build tidak diblok oleh error tipe/lint. Jalankan `npm run typecheck` untuk melihat peringatan tipe.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
