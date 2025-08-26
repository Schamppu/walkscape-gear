# Stage 1: Node environment for building the Vite app
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with retry logic and rate limiting protection
RUN npm config set registry https://registry.npmjs.org/ && \
  npm config set fetch-retries 5 && \
  npm config set fetch-retry-factor 2 && \
  npm config set fetch-retry-mintimeout 10000 && \
  npm config set fetch-retry-maxtimeout 60000 && \
  npm install --verbose

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Nginx to serve the built app
FROM nginx:alpine AS serve

COPY --from=build app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]