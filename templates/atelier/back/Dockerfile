FROM node:24-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
EXPOSE 8080
USER node
CMD ["node", "src/index.js"]
