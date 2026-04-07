FROM node:20-slim

# Install ffmpeg, openssl (required by Prisma), and ca-certificates for HTTPS API calls
RUN apt-get update && apt-get install -y ffmpeg openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Run prisma db push on startup to ensure schema is up to date, then start the app
CMD ["sh", "-c", "npx prisma db push && npm start"]
