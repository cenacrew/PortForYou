# Construit depuis la RACINE du monorepo :
#   docker build -f apps/web/Dockerfile -t pfy-web .
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @portforyou/web --filter @portforyou/shared
COPY packages/shared packages/shared
COPY apps/web apps/web
# Next.js inline les variables NEXT_PUBLIC_* au BUILD : l'URL de l'API doit
# donc être fournie ici (build-arg), pas au runtime du conteneur.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @portforyou/shared build && pnpm --filter @portforyou/web build

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
USER node
CMD ["node", "apps/web/server.js"]
