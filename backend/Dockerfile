FROM node:20

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies with retry logic and rate limiting protection
RUN npm config set registry https://registry.npmjs.org/ && \
  npm config set fetch-retries 5 && \
  npm config set fetch-retry-factor 2 && \
  npm config set fetch-retry-mintimeout 10000 && \
  npm config set fetch-retry-maxtimeout 60000 && \
  npm install --verbose

# Copy source code
COPY . .
RUN npm install --omit=dev


RUN apt-get update && apt-get install -y netcat-openbsd openssl && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]