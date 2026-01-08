FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN corepack enable

ARG CAPROVER_GIT_COMMIT_SHA=dev
RUN echo "CAPROVER_GIT_COMMIT_SHA=${CAPROVER_GIT_COMMIT_SHA}"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm -r build

ENV NODE_ENV=production

EXPOSE 3000
CMD ["bash", "./scripts/start-caprover.sh"]

