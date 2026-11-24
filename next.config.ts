import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // le script du widget est lu à l'exécution par la page /widget
  outputFileTracingIncludes: { "/widget": ["./widget/**"] },
};

export default nextConfig;
