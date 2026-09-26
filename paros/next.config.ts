import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows testing from mobile phone on local Wi-Fi without cross-origin HMR warnings
  allowedDevOrigins: ['192.168.31.143', 'localhost:3000'],
};

export default nextConfig;
