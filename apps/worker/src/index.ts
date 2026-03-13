import { createServer } from "node:http";
import { Queue, type Job, Worker } from "bullmq";
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
const deadLetterQueue = new Queue(queueNames.deadLetter, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: false,
  },
});

async function toDeadLetterQueue(
  queueName: string,
  job: Job | undefined,
  error: Error,
): Promise<void> {
  if (!job) {
    return;
  }

  await deadLetterQueue.add(
    "dead-letter",
    {
      sourceQueue: queueName,
      sourceJobId: job.id,
      attemptsMade: job.attemptsMade,
      payload: job.data,
      failedReason: error.message,
      movedAt: new Date().toISOString(),
    },
    {
      removeOnComplete: 1000,
      removeOnFail: false,
      // Keep one dead-letter record per source job id.
      jobId: `${queueName}:${job.id ?? "unknown"}`,
    },
  );
}

async function ensureIdempotency(
  queue: Queue,
  queueName: string,
  job: Job,
): Promise<boolean> {
  const data = job.data as { idempotencyKey?: unknown } | null;
  const idempotencyKey =
    data && typeof data.idempotencyKey === "string"
      ? data.idempotencyKey.trim()
      : "";

  if (!idempotencyKey) {
    return true;
  }

  const redisClient = await queue.client;
  const key = `atlas:worker:idem:${queueName}:${idempotencyKey}`;
  const inserted = await redisClient.set(
    key,
    String(job.id ?? "no-job-id"),
    "EX",
    env.IDEMPOTENCY_TTL_SECONDS,
    "NX",
  );

  if (inserted === "OK") {
    return true;
  }

  logger.warn(
    { queueName, jobId: job.id, idempotencyKey },
    "Duplicate job detected by idempotency key; skipping",
  );
  return false;
}

const queueEntries = Object.entries(queueNames).filter(
  ([key]) => key !== "deadLetter",
);

for (const [, queueName] of queueEntries) {
  const queue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
      attempts: env.WORKER_RETRY_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: env.WORKER_RETRY_DELAY_MS,
      },
      removeOnComplete: 1000,
      removeOnFail: false,
    },
  });
  queues.push(queue);

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const canProcess = await ensureIdempotency(queue, queueName, job);
      if (!canProcess) {
        return;
      }

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

    const maxAttempts = job?.opts.attempts ?? 1;
    if (job && job.attemptsMade >= maxAttempts) {
      void toDeadLetterQueue(queueName, job, error);
    }
  });

  workers.push(worker);

  const bootstrapIdempotencyKey = `bootstrap-${queueName}`;
  void queue.add(
    "bootstrap",
    {
      createdAt: new Date().toISOString(),
      idempotencyKey: bootstrapIdempotencyKey,
    },
    {
      removeOnComplete: true,
      attempts: env.WORKER_RETRY_ATTEMPTS,
      backoff: {
        type: "exponential",
        delay: env.WORKER_RETRY_DELAY_MS,
      },
    },
  );
}

logger.info(
  {
    queues: queueEntries.map(([, queueName]) => queueName),
    concurrency: env.WORKER_CONCURRENCY,
    retries: env.WORKER_RETRY_ATTEMPTS,
    retryDelayMs: env.WORKER_RETRY_DELAY_MS,
  },
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
  await deadLetterQueue.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
