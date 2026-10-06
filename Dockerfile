FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:node

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ARG APP_COMMIT=unknown
LABEL org.opencontainers.image.title="JBFD" \
      org.opencontainers.image.revision=$APP_COMMIT
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 APP_COMMIT=$APP_COMMIT
COPY --from=build --chown=node:node /app/dist/standalone/ ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
