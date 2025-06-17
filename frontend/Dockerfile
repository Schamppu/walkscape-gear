# Stage 1: Node environment for building the Vite app
FROM node:20-alpine AS build
WORKDIR /app

COPY . .
RUN npm install
RUN npm run build

# Stage 2: Nginx to serve the built app
FROM nginx:alpine AS serve

COPY --from=build app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]