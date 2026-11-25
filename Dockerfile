# Build the app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Small runtime: only the built files, the server and its few dependencies
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5173
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY --from=builder /app/dist ./dist
EXPOSE 5173
USER node
CMD ["node", "server/index.js"]
