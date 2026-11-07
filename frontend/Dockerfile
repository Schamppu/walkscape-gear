# Stage 1: Node environment for building the Vite app
FROM node:22-alpine AS build
WORKDIR /app

COPY . .
RUN npm install

# Build the application
RUN npm run build

# Stage 2: Nginx to serve the built app
FROM nginx:alpine AS serve

COPY --from=build app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]