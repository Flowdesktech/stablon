import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep firebase-admin (and its native/optional deps) out of the bundle so it
  // runs in the Node serverless runtime instead of being traced/bundled.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
