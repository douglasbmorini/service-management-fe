# Stage 1: Build the Angular application
FROM node:22-alpine AS build

WORKDIR /app

# Copia os arquivos de manifesto de pacotes
COPY package.json package-lock.json ./

# Instala as dependências usando 'npm ci' para builds mais rápidos e consistentes
RUN npm ci

# Copia o restante do código-fonte da aplicação
COPY . .
RUN npm run build:prod

# Stage 2: Serve the application from Nginx
FROM nginx:1.25-alpine

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Angular app from the 'build' stage
COPY --from=build /app/dist/service-management-fe/browser /usr/share/nginx/html
