# Build from the repository root:
#   docker build -f server/Dockerfile -t kanban-api .
#
# Two stages so the image carries no TypeScript sources and no build cache.
# node_modules is copied whole rather than pruned: the Prisma query engine is
# generated into node_modules/.prisma, which npm does not track, so `npm prune`
# is a reliable way to end up with an image that only fails at runtime.

FROM node:22-alpine AS build

WORKDIR /app

# Manifests first: this layer stays cached until a dependency actually changes
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci --ignore-scripts

COPY shared ./shared
COPY server ./server

RUN npm run build --workspace shared
RUN npm run build --workspace server

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/shared/dist ./shared/dist
COPY --from=build --chown=node:node /app/shared/package.json ./shared/package.json
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/server/package.json ./server/package.json
COPY --from=build --chown=node:node /app/server/prisma ./server/prisma

USER node
WORKDIR /app/server

EXPOSE 4000

# Migrations are deliberately not run here. They belong in a pre-deploy step so
# a failed migration blocks the release instead of crash-looping the container.
CMD ["node", "dist/index.js"]
