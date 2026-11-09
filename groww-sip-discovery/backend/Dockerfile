# Build context: the monorepo root (groww-sip-discovery/), because the backend imports ../shared.
#   docker build -f backend/Dockerfile -t groww-sip-backend .
# Debian slim, not Alpine: onnxruntime-node (BGE embeddings) ships glibc binaries only.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
# Only the manifest: keeps the workspace consistent with pnpm-lock.yaml; no frontend code goes in the image.
COPY frontend/package.json frontend/
RUN pnpm install --frozen-lockfile --filter "@groww-sip/backend..."
COPY shared shared
COPY backend backend
RUN pnpm --filter @groww-sip/backend typecheck
# Bake the BGE model into the image so the server never downloads it at runtime.
RUN pnpm --filter @groww-sip/backend model:download
# Drop dev dependencies.
RUN pnpm install --frozen-lockfile --prod --filter "@groww-sip/backend..."

FROM base AS runtime
ENV NODE_ENV=production PORT=5000
COPY --from=build --chown=node:node /app /app
USER node
WORKDIR /app/backend
EXPOSE 5000
CMD ["node", "--import", "tsx", "src/index.ts"]
