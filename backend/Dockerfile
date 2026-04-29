FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
ENV NODE_ENV=development
COPY package*.json ./
# Prisma schema is needed because `npm ci` runs `postinstall` (prisma generate).
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
# Ensure Prisma client is generated inside the image.
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies for production runtime.
RUN npm prune --omit=dev

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
EXPOSE 3001
CMD ["node", "dist/main"]

FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

