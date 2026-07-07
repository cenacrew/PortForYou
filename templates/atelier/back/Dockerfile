# Construit depuis la RACINE du monorepo (le back dépend de packages/template-back-core) :
#   docker build -f templates/atelier/back/Dockerfile -t atelier-back .
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/template-back-core/package.json packages/template-back-core/
COPY templates/atelier/back/package.json templates/atelier/back/
RUN pnpm install --frozen-lockfile --filter @portforyou/atelier-back --filter @portforyou/template-back-core
COPY packages/template-back-core packages/template-back-core
COPY templates/atelier/back templates/atelier/back
RUN pnpm --filter @portforyou/template-back-core build
RUN pnpm --filter @portforyou/atelier-back --prod --config.inject-workspace-packages=true deploy /out

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/templates/atelier/back/src ./src
COPY --from=build /repo/templates/atelier/back/package.json ./
EXPOSE 8080
USER node
CMD ["node", "src/index.js"]
