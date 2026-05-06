# --- Stage 1 : build Vite ---
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# --- Stage 2 : Nginx serve dist + reverse proxy /api ---
FROM nginx:1.27-alpine

# Notre conf nginx remplace la conf par défaut
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Préparer le webroot pour le challenge Certbot HTTP-01
RUN mkdir -p /var/www/certbot

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
