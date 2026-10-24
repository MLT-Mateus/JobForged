FROM node:22-bookworm-slim
WORKDIR /srv/jbfd/services/security-gateway
COPY services/security-gateway/package.json services/security-gateway/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY services/security-gateway/policy.mjs services/security-gateway/server.mjs ./
COPY shared/password-policy.mjs shared/password-policy.json /srv/jbfd/shared/
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
