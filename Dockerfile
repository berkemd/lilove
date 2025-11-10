# LiLove Production Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --production && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Create necessary directories
RUN mkdir -p uploads logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
