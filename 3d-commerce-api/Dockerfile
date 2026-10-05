FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update   && apt-get install -y --no-install-recommends openssl   && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN apt-get update   && apt-get install -y --no-install-recommends openssl   && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY scripts ./scripts

# Runtime 3D processing tools. Pin versions so production builds are
# reproducible and do not depend on binaries installed on the host.
# gltf-validator's published npm version is 2.0.0-dev.3.10, not 2.0.0.
RUN npm install --global --no-audit --no-fund     @gltf-transform/cli@4.5.1     gltf-validator@2.0.0-dev.3.10

ENV NODE_PATH=/usr/local/lib/node_modules

RUN gltf-transform --version   && node -e "require('gltf-validator'); console.log('gltf-validator: OK')"

RUN chown -R node:node /app
USER node

EXPOSE 4000
CMD ["node", "dist/main.js"]
