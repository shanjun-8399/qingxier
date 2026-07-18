FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY server/package.json ./server/package.json
COPY miniprogram/package.json ./miniprogram/package.json
COPY admin/package.json ./admin/package.json
RUN npm ci --ignore-scripts --no-audit --no-fund --workspace @qingxier/contracts --workspace @qingxier/server
COPY packages/contracts ./packages/contracts
COPY server ./server
RUN npm run build --workspace @qingxier/contracts && npm run build --workspace @qingxier/server

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY server/package.json ./server/package.json
COPY miniprogram/package.json ./miniprogram/package.json
COPY admin/package.json ./admin/package.json
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund --workspace @qingxier/contracts --workspace @qingxier/server && npm cache clean --force
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/server/dist ./server/dist
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:8000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/dist/main.js"]
