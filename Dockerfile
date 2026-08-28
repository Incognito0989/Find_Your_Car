# Use Node.js 20 LTS Alpine image for minimal size and fast builds
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install all dependencies for build
RUN npm install

# Copy application source code
COPY . .

# Build the backend bundle
RUN npm run build

# Production runtime stage (Headless Backend Server)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_ONLY=false

# Copy built bundle and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Create persistent data directories
RUN mkdir -p /app/data/uploads

# Volume mount point for persistent SQLite database and photos
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
