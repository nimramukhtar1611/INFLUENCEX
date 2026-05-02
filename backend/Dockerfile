FROM node:20-alpine

WORKDIR /app

# Prevent Cypress from downloading during npm install
ENV CYPRESS_INSTALL_BINARY=0

# Install system dependencies needed for native modules (like sharp)
RUN apk add --no-cache libc6-compat

COPY package*.json ./

# Omit devDependencies (like Jest, etc) to speed up build
RUN npm ci --omit=dev --loglevel=warn

# Only copy what is needed (exclude tests via .dockerignore)
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]