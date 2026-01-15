FROM node:20-alpine

WORKDIR /app

# Install deps first (better caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY . .

# Default env
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/api/server.js"]
