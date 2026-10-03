FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist

# 3D processing runs in the background worker. Pin the CLI versions so
# production does not depend on a manually installed host binary.
RUN npm install --global --no-audit --no-fund \
    @gltf-transform/cli@4.5.1 \
    gltf-validator@2.0.0

ENV NODE_PATH=/usr/local/lib/node_modules

RUN chown -R node:node /app
USER node

EXPOSE 3001
CMD ["node", "dist/main.js"]
