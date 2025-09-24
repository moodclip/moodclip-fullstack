# ---- STAGE 1: Builder ----
# This stage installs all dependencies (including devDependencies),
# builds your application, and generates the Prisma client.
FROM node:20-slim AS builder
WORKDIR /app
ENV ROLLUP_SKIP_NODE_NATIVE=true

# Copy all package manifests, including the lock file for npm ci
COPY package.json package-lock.json ./
COPY extensions/moodclip-uploader/package.json ./extensions/moodclip-uploader/

# Refresh the lockfile for the Linux target before installing dependencies, then
# ensure Rollup's native optional dependency for Linux is present so Vite builds succeed.
RUN npm install --package-lock-only --ignore-scripts \
  && npm ci --workspaces --include-workspace-root \
  && npm install --no-save --ignore-scripts @rollup/rollup-linux-x64-gnu

# Copy the rest of your source code
COPY . .

# Copy pre-built extension assets (avoid rollup build issues)
COPY extensions/moodclip-uploader/assets ./extensions/moodclip-uploader/assets

# Run only the Remix build command
RUN npx remix vite:build

# Generate the Prisma client which is needed by the runtime
RUN npx prisma generate


# ---- STAGE 2: Runtime ----
# This stage creates the final, lean image with only what's needed to run.
FROM node:20-slim
ENV NODE_ENV=production
ENV ROLLUP_SKIP_NODE_NATIVE=true

# Install OpenSSL, which is a runtime dependency for Prisma
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy package files again to install only production dependencies
COPY package.json package-lock.json ./
COPY extensions/moodclip-uploader/package.json ./extensions/moodclip-uploader/

# Refresh the lockfile for the Linux target before installing production dependencies.
RUN npm install --package-lock-only --ignore-scripts \
  && npm ci --workspaces --include-workspace-root --omit=dev

# Copy the compiled application and public assets from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

# Copy the generated Prisma client and schema from the builder stage
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/prisma/schema.prisma ./prisma/

# Expose the port your app runs on
EXPOSE 8080

# The command to start the application, including the production database migration
CMD ["npm", "run", "start:prod"]
