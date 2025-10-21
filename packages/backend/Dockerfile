FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy backend package files
COPY packages/backend/package.json ./packages/backend/

# Copy backend source code (need this before install for workspace to work properly)
COPY packages/backend ./packages/backend

# Install dependencies - this will install to workspace root and link properly
RUN pnpm install --no-frozen-lockfile

# Generate database migrations
WORKDIR /app/packages/backend
RUN pnpm exec drizzle-kit generate

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Copy Drizzle files for migrations
COPY --from=builder /app/packages/backend/drizzle ./packages/backend/drizzle
COPY packages/backend/drizzle.config.ts ./packages/backend/
COPY packages/backend/src/db/schema.ts ./packages/backend/src/db/

WORKDIR /app/packages/backend

# Cloud Run requires PORT environment variable (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

CMD ["node", "dist/index.js"]
