import { createServer } from "node:http";
import { Queue, Worker } from "bullmq";
import { env } from "./config/env.js";
import { processJob } from "./jobs/processors.js";
import { logger } from "./lib/logger.js";
import { queueNames } from "./queues/names.js";

const redis = new URL(env.REDIS_URL);
const connection = {
  host: redis.hostname,
  port: Number(redis.port || 6379),
  username: redis.username || undefined,
  password: redis.password || undefined,
};

const queues: Queue[] = [];
const workers: Worker[] = [];

for (const queueName of Object.values(queueNames)) {
  const queue = new Queue(queueName, { connection });
  queues.push(queue);

  const worker = new Worker(
    queueName,
    async (job) => {
      await processJob(queueName, job.data);
    },
    {
      connection,
      concurrency: env.WORKER_CONCURRENCY,
    },
  );

  worker.on("completed", (job) => {
    logger.info({ queueName, jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ queueName, jobId: job?.id, error }, "Job failed");
  });

  workers.push(worker);

  void queue.add(
    "bootstrap",
    { createdAt: new Date().toISOString() },
    { removeOnComplete: true },
  );
}

logger.info(
  { queues: Object.values(queueNames), concurrency: env.WORKER_CONCURRENCY },
  "Atlas worker started",
);

const healthServer = createServer((request, response) => {
  if (request.url === "/health" || request.url === "/ready") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", service: "worker" }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ status: "not_found" }));
});

healthServer.listen(env.HEALTH_PORT, () => {
  logger.info({ port: env.HEALTH_PORT }, "Worker health server started");
});

async function shutdown() {
  logger.info("Shutting down worker...");
  await new Promise<void>((resolve, reject) => {
    healthServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
  await Promise.all(workers.map((worker) => worker.close()));
  await Promise.all(queues.map((queue) => queue.close()));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
