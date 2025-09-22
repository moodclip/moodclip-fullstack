# ---- STAGE 1: Builder ----
# This stage installs all dependencies (including devDependencies),
# builds your application, and generates the Prisma client.
FROM node:20-slim AS builder
WORKDIR /app

# Copy all package manifests, including the lock file for npm ci
COPY package.json package-lock.json ./
COPY extensions/moodclip-uploader/package.json ./extensions/moodclip-uploader/

# Use `npm ci` for a more reliable and faster install in CI/CD environments
RUN npm ci --workspaces --include-workspace-root

# Copy the rest of your source code
COPY . .

# Run the build command, which compiles both Remix and the extension
RUN npm run build

# Generate the Prisma client which is needed by the runtime
RUN npx prisma generate


# ---- STAGE 2: Runtime ----
# This stage creates the final, lean image with only what's needed to run.
FROM node:20-slim
ENV NODE_ENV=production

# Install OpenSSL, which is a runtime dependency for Prisma
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy package files again to install only production dependencies
COPY package.json package-lock.json ./
COPY extensions/moodclip-uploader/package.json ./extensions/moodclip-uploader/

# Install ONLY production dependencies using `npm ci`
RUN npm ci --workspaces --include-workspace-root --omit=dev

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
