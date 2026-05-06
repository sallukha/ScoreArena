# ---- Base Node Stage ----
FROM node:22-alpine AS base
WORKDIR /app

# ---- Builder Stage ----
FROM base AS builder
# Build arguments for environment variables needed at build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package files
COPY package*.json ./
# Install ALL dependencies
RUN npm ci

# Copy source code
COPY . .
# Build the Vite application
RUN npm run build

# ---- Production Stage (Nginx) ----
FROM nginx:alpine AS runner
# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled code from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
