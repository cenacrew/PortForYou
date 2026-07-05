# Construit depuis la RACINE du monorepo :
#   docker build -f apps/api/Dockerfile -t pfy-api .
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @portforyou/api --filter @portforyou/shared
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @portforyou/shared build && pnpm --filter @portforyou/api build
RUN pnpm --filter @portforyou/api --prod --config.inject-workspace-packages=true deploy /out

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./
EXPOSE 8080
USER node
CMD ["node", "dist/index.js"]
