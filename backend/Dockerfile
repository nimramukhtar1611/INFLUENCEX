FROM node:20-alpine

WORKDIR /app

# Prevent Cypress from downloading during npm install
ENV CYPRESS_INSTALL_BINARY=0

COPY package*.json ./

# Omit devDependencies (like Jest, etc) to speed up build
RUN npm ci --omit=dev

# Only copy what is needed (exclude tests via .dockerignore)
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]