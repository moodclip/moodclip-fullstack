import { PrismaClient } from "@prisma/client";

let prisma;

console.log("--- [DB_SERVER_DEBUG] --- Top of db.server.js ---");
console.log(`[DB_SERVER_DEBUG] NODE_ENV: ${process.env.NODE_ENV}`);

try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        // Mask the password for security before logging
        const maskedUrl = dbUrl.replace(/:([^:@\s]+)@/, ':********@');
        console.log(`[DB_SERVER_DEBUG] DATABASE_URL found: ${maskedUrl}`);
    } else {
        console.error("[DB_SERVER_DEBUG] CRITICAL: DATABASE_URL environment variable is NOT SET.");
    }

    if (process.env.NODE_ENV === "production") {
        console.log("[DB_SERVER_DEBUG] Production mode: Initializing new PrismaClient.");
        prisma = new PrismaClient();
    } else {
        console.log("[DB_SERVER_DEBUG] Development mode: Checking for global PrismaClient instance.");
        if (!global.__db) {
            console.log("[DB_SERVER_DEBUG] No global instance found. Initializing new PrismaClient for global cache.");
            global.__db = new PrismaClient();
        }
        prisma = global.__db;
        console.log("[DB_SERVER_DEBUG] Using cached global PrismaClient instance.");
    }
    console.log("[DB_SERVER_DEBUG] Prisma client has been initialized successfully.");

} catch (error) {
    console.error("[DB_SERVER_DEBUG] FATAL ERROR during PrismaClient initialization:", error);
    // Force the container to crash to make the error visible in Cloud Run logs
    process.exit(1);
}

console.log("[DB_SERVER_DEBUG] Exporting Prisma client from db.server.js.");
export default prisma;
