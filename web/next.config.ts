import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // /api/chat reads web/knowledge/*.md at runtime via fs.readdirSync, which Next's
  // static file tracer can miss since the file list isn't statically determinable —
  // declare it explicitly so the markdown ships with the deployed function.
  outputFileTracingIncludes: {
    '/api/chat': ['./knowledge/**/*.md'],
  },
};

export default nextConfig;
