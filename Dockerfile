FROM node:24-alpine

WORKDIR /app

# Proper signal handling / reaping (important in containers)
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./

# Install prod dependencies
RUN npm ci --omit=dev

# Copy app code
COPY src ./src
COPY data ./data

ENV NODE_ENV=production \
    PORT=3001

EXPOSE 3001

# Drop privileges (official image provides 'node' user)
USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/api/server.js"]
