/** @type {import('next').NextConfig} */
const nextConfig = {
    // This allows Next.js to render images from external URLs.
    // Add the hostnames of your M3U/Xtream logo providers here.
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: '**',
            },
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
};

export default nextConfig;
