# Shared Reading Lists - React Router (framework mode) on Node 24 LTS.
# Stages: deps -> check (lint, type-check, tests; run with DATABASE_URL) | build -> prod-deps -> preview (default, last).

FROM node:24-slim AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
WORKDIR /app
RUN chown node:node /app
USER node

# ---- all dependencies (development + production) ----
FROM base AS deps
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

# ---- candidate checks: `docker run -e DATABASE_URL=... <check image>` (no network access needed at run time) ----
FROM deps AS check
COPY --chown=node:node . .
ENV APP_ENV=test
CMD ["npm", "run", "check"]

# ---- production build ----
FROM deps AS build
COPY --chown=node:node . .
RUN npm run build

# ---- production dependencies only ----
# `npm ci --omit=dev` keeps dev packages that are also optional peers of runtime packages ("devOptional",
# e.g. vite/vitest/drizzle-kit via better-auth); dropping devDependencies and pruning removes them.
FROM base AS prod-deps
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev \
 && npm pkg delete devDependencies \
 && npm prune --omit=dev

# ---- preview / production-mode image (default stage) ----
FROM node:24-slim AS preview
ARG APP_RELEASE=""
ARG PUBLIC_SENTRY_DSN=""
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    APP_RELEASE=${APP_RELEASE} \
    PUBLIC_SENTRY_DSN=${PUBLIC_SENTRY_DSN}
WORKDIR /app
# Read-only application files (owned by root); the app runs unprivileged and needs no capabilities.
COPY package.json instrument.server.mjs ./
COPY drizzle ./drizzle
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
USER node
EXPOSE 8080
# Start-up: apply migrations + seed (idempotent), then serve HTTP on 0.0.0.0:$PORT.
CMD ["sh", "-c", "node build/setup.mjs && exec node --import ./instrument.server.mjs node_modules/@react-router/serve/bin.cjs ./build/server/index.js"]
