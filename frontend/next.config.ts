import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run build` writes a static site to out/, which the Python backend serves
  // in app mode (start.vbs). `npm run dev` is unaffected.
  output: "export",
};

export default nextConfig;
