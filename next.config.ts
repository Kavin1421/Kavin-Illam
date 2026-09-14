import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com",
      "font-src 'self' data:",
      "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com",
      "frame-src 'self' blob: https://res.cloudinary.com",
      "worker-src 'self'",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

/** Docker / self-host only — never on Vercel or Netlify (Lambda size limits). */
const useStandaloneOutput = !process.env.VERCEL && !process.env.NETLIFY;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer"],
  ...(useStandaloneOutput ? { output: "standalone" as const } : {}),
  // Only for standalone Docker traces. Broad Prisma globs on Netlify/Vercel
  // pull multi-platform engines + pnpm trees into the serverless handler and
  // can exceed the 250 MB unzipped function limit.
  ...(useStandaloneOutput
    ? {
        outputFileTracingIncludes: {
          "/*": [
            "./node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/libquery_engine-*",
            "./node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/schema.prisma",
            "./node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/index.js",
          ],
        },
      }
    : {}),
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      ],
    },
  ],
};

export default nextConfig;
