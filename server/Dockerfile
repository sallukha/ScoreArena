# ---- Base Stage ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Builder Stage ----
FROM base AS builder
# Copy package files
COPY package*.json ./
# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .
# Build the TypeScript code
RUN npm run build

# ---- Production Stage ----
FROM base AS runner
# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./
# Install ONLY production dependencies
RUN npm ci --only=production

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Use a non-root user for security
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
