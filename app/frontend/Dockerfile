###############################
# Frontend: Next.js with pnpm  #
###############################
# 1) Dependencies layer
FROM node:20-slim AS deps
WORKDIR /app

# Keep the image minimal; rely on prebuilt binaries for native deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack and prepare pnpm
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@8 --activate

# Copy manifest and lockfile when available
COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN pnpm --version \
    && if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# 2) Builder layer
FROM node:20-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@8 --activate

# Bring installed node_modules from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (respects .dockerignore in this directory)
COPY . .

# Build-time configuration
ARG BACKEND_URL=http://backend:8000
ARG NEXT_PUBLIC_TIMEZONE=Asia/Riyadh
ENV BACKEND_URL=${BACKEND_URL}
ENV NEXT_PUBLIC_TIMEZONE=${NEXT_PUBLIC_TIMEZONE}

# Build Next.js app
RUN pnpm build

# 3) Runner layer (slim)
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone output (minimal runtime)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]


