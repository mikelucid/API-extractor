# Build stage
FROM node:20-alpine AS build
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Production stage - serve with a minimal static server
FROM node:20-alpine AS production
WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
