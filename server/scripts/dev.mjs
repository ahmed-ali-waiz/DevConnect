import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, "..");
const MONGO_PORT = 27017;
const mongoUri = process.env.MONGO_URI || "";

function findMongod() {
  if (process.env.MONGOD_EXE && existsSync(process.env.MONGOD_EXE)) {
    return process.env.MONGOD_EXE;
  }
  const candidates = [
    "C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe",
    "C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe",
    "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "mongod";
}

function portOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const s = net.createConnection({ port, host }, () => {
      s.end();
      resolve(true);
    });
    s.on("error", () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await portOpen(port)) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(
    `MongoDB did not accept connections on 127.0.0.1:${port} within ${timeoutMs / 1000}s. Check server/mongodb-logs/mongod.log`
  );
}

async function ensureMongo() {
  // If using Atlas (mongodb+srv / remote URI), do not spawn local mongod.
  if (mongoUri.startsWith("mongodb+srv://") || (mongoUri.startsWith("mongodb://") && !mongoUri.includes("127.0.0.1") && !mongoUri.includes("localhost"))) {
    console.log("Remote MongoDB URI detected. Skipping local mongod startup.");
    return;
  }

  if (await portOpen(MONGO_PORT)) {
    console.log("MongoDB already listening on port", MONGO_PORT);
    return;
  }

  const cfg = path.join(serverDir, "mongod.cfg");
  if (!existsSync(cfg)) {
    throw new Error(`Missing ${cfg}`);
  }

  const exe = findMongod();
  console.log("Starting MongoDB (" + exe + ")…");

  const child = spawn(exe, ["--config", cfg], {
    cwd: serverDir,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  child.on("error", (err) => {
    console.error("Failed to spawn mongod:", err.message);
    process.exit(1);
  });

  await waitForPort(MONGO_PORT);
  console.log("MongoDB ready on 127.0.0.1:" + MONGO_PORT);
}

await ensureMongo();

const node = spawn(process.execPath, ["--watch", path.join(serverDir, "server.js")], {
  cwd: serverDir,
  stdio: "inherit",
  env: process.env,
});

node.on("exit", (code) => process.exit(code ?? 0));
