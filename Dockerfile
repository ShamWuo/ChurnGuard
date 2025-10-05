# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run precompile-templates && npm run build
# Generate Prisma client if schema exists. Do not swallow errors in production
# builds so the build fails fast when Prisma codegen is broken.
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production && npm cache clean --force
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/pages ./pages
EXPOSE 3000
ENV PORT=3000
CMD ["npm","run","start"]
