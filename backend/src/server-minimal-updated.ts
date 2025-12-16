/**
 * ========================================
 * MINIMAL EXPRESS SERVER - PRODUCTION
 * ========================================
 * With BullMQ + Redis + AmoCRM Bulk Sync
 */

// ✅ LOAD ENV FIRST!
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env") });

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";

const app: Express = express();
const PORT = process.env.PORT || 3000;

console.log("🔧 Environment loaded");
console.log("🔧 SUPABASE_URL:", process.env.SUPABASE_URL ? "✅ Set" : "❌ Missing");
console.log("🔧 REDIS_URL:", process.env.REDIS_URL || "redis://localhost:6379");
console.log("🔧 NODE_ENV:", process.env.NODE_ENV || "development");

// ================================================
// INITIALIZE REDIS & QUEUE WORKER
// ================================================
let queueInitialized = false;

(async () => {
  try {
    console.log("🚀 Initializing BullMQ queue worker...");
    
    // Import queue worker (this will start processing jobs)
    const { amocrmSyncWorker } = await import("./queues/amocrmSyncQueue");
    
    console.log("✅ BullMQ queue worker initialized");
    queueInitialized = true;
  } catch (error: any) {
    console.error("❌ Failed to initialize queue worker:", error.message);
    console.warn("⚠️ Server will continue without queue worker");
  }
})();

// ================================================
// 1️⃣ LOGGING MIDDLEWARE (FIRST!)
// ================================================
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`\n${"-".repeat(60)}`);
  console.log(`[${requestId}] ⬆️  ${req.method} ${req.path}`);
  
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - start;
    console.log(`[${requestId}] ⬇️  ${res.statusCode} (${duration}ms)`);
    return originalSend.call(this, data);
  };
  
  next(); // ⭐ CRITICAL!
});

// ================================================
// 2️⃣ BASIC SECURITY
// ================================================
app.use(helmet({
  contentSecurityPolicy: false,
}));

// ================================================
// 3️⃣ BODY PARSER MIDDLEWARE
// ================================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ================================================
// 4️⃣ CORS MIDDLEWARE
// ================================================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ================================================
// 5️⃣ HEALTH CHECK
// ================================================
app.get("/api/health", (req: Request, res: Response) => {
  return res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    queue: queueInitialized ? "initialized" : "not_initialized",
  });
});

// ================================================
// 6️⃣ BULK SYNC ROUTER (NEW!)
// ================================================
try {
  const bulkSyncRouter = require("./routes/bulk-sync").default;
  app.use("/api/bulk-sync", bulkSyncRouter);
  console.log("✅ Bulk sync router loaded");
} catch (error: any) {
  console.error("❌ Failed to load bulk sync router:", error.message);
}

// ================================================
// 7️⃣ LANDING ROUTER
// ================================================
try {
  const landingRouter = require("./routes/landing").default;
  app.use("/api/landing", landingRouter);
  console.log("✅ Landing router loaded");
} catch (error: any) {
  console.error("❌ Failed to load landing router:", error.message);
}

// ================================================
// 8️⃣ TELEGRAM WEBHOOK
// ================================================
try {
  const telegramWebhookRouter = require("./routes/telegram-webhook").default;
  app.use("/api/telegram-webhook", telegramWebhookRouter);
  console.log("✅ Telegram webhook loaded");
} catch (error: any) {
  console.error("❌ Failed to load telegram webhook:", error.message);
}

// ================================================
// 9️⃣ TRIPWIRE ROUTERS
// ================================================
try {
  const tripwireCoursesRouter = require("./routes/tripwire-courses").default;
  app.use("/api/tripwire/courses", tripwireCoursesRouter);
  console.log("✅ Tripwire courses loaded");
} catch (error: any) {
  console.error("❌ Failed to load tripwire courses:", error.message);
}

try {
  const tripwireLessonsRouter = require("./routes/tripwire-lessons").default;
  app.use("/api/tripwire/lessons", tripwireLessonsRouter);
  console.log("✅ Tripwire lessons loaded");
} catch (error: any) {
  console.error("❌ Failed to load tripwire lessons:", error.message);
}

try {
  const tripwireAuthRouter = require("./routes/tripwire-auth").default;
  app.use("/api/tripwire/auth", tripwireAuthRouter);
  console.log("✅ Tripwire auth loaded");
} catch (error: any) {
  console.error("❌ Failed to load tripwire auth:", error.message);
}

try {
  const tripwireProfileRouter = require("./routes/tripwire-profile").default;
  app.use("/api/tripwire/profile", tripwireProfileRouter);
  console.log("✅ Tripwire profile loaded");
} catch (error: any) {
  console.error("❌ Failed to load tripwire profile:", error.message);
}

try {
  const tripwireStaffRouter = require("./routes/tripwire-staff").default;
  app.use("/api/tripwire/staff", tripwireStaffRouter);
  console.log("✅ Tripwire staff loaded");
} catch (error: any) {
  console.error("❌ Failed to load tripwire staff:", error.message);
}

try {
  const tripwireMaterialsRouter = require("./routes/tripwire-materials").default;
  app.use("/api/tripwire/materials", tripwireMaterialsRouter);
  console.log("✅ Tripwire materials loaded");
} catch (error: any) {
  console.error("❌ Failed to load tripwire materials:", error.message);
}

// ================================================
// 🔟 ADMIN LANDING SYNC (old endpoint for compatibility)
// ================================================
try {
  const landingSyncRouter = require("./routes/landing-sync-amocrm").default;
  app.use("/api/admin/landing", landingSyncRouter);
  console.log("✅ Admin landing sync loaded");
} catch (error: any) {
  console.error("❌ Failed to load admin landing sync:", error.message);
}

// ================================================
// ERROR HANDLER
// ================================================
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ Unhandled error:", err);
  
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// ================================================
// GRACEFUL SHUTDOWN
// ================================================
async function gracefulShutdown(signal: string) {
  console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);
  
  try {
    // Close queue connections
    if (queueInitialized) {
      const { closeQueue } = await import("./queues/amocrmSyncQueue");
      await closeQueue();
    }
    
    // Close Redis connection
    const { disconnectRedis } = await import("./config/redis");
    await disconnectRedis();
    
    console.log("✅ Cleanup completed");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ================================================
// START SERVER
// ================================================
app.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔄 BullMQ Queue: ${queueInitialized ? "✅ Active" : "⏳ Initializing..."}`);
  console.log(`${"=".repeat(60)}\n`);
});

