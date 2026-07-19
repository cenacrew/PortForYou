# Construit depuis la RACINE du monorepo (le back dépend de packages/template-back-core) :
#   docker build -f templates/monolith/back/Dockerfile -t monolith-back .
FROM node:24.18.0-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/template-back-core/package.json packages/template-back-core/
COPY templates/monolith/back/package.json templates/monolith/back/
RUN pnpm install --frozen-lockfile --filter @portforyou/monolith-back --filter @portforyou/template-back-core
COPY packages/template-back-core packages/template-back-core
COPY templates/monolith/back templates/monolith/back
RUN pnpm --filter @portforyou/template-back-core build
RUN pnpm --filter @portforyou/monolith-back --prod --config.inject-workspace-packages=true deploy /out

FROM node:24.18.0-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/templates/monolith/back/src ./src
COPY --from=build /repo/templates/monolith/back/package.json ./
EXPOSE 8080
USER node
CMD ["node", "src/index.js"]
