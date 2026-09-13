# syntax=docker/dockerfile:1

# Kavin Illam — production image (Node 24 LTS + Next.js standalone)
# Runtime secrets come from the environment / compose — never bake .env into layers.

FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY public ./public
COPY src ./src
COPY next.config.ts tsconfig.json postcss.config.mjs components.json ./
# Placeholder env so Prisma generate + Next build can complete.
# Real secrets are injected only at container runtime.
ENV NODE_ENV=production
ENV DATABASE_URL="mongodb://127.0.0.1:27017/kavin-illam-build"
ENV AUTH_SECRET="build-time-placeholder-secret-min-32-chars"
RUN pnpm exec prisma generate \
  && pnpm exec next build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
