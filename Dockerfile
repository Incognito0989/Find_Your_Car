# Use Node.js 20 LTS Alpine image for minimal size and fast builds
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy application source code
COPY . .

# Build the frontend and backend bundle
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Create persistent data directories
RUN mkdir -p /app/data/uploads

# Volume mount point for persistent server storage
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
