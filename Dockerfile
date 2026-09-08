FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/app/data/attic.sqlite
WORKDIR /app
RUN mkdir /app/data && chown node:node /app/data
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/package.json ./package.json
COPY scripts/server.mjs scripts/preview.mjs scripts/manage.mjs ./scripts/
COPY lib/profile.ts ./lib/profile.ts
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "--experimental-strip-types", "scripts/preview.mjs"]
