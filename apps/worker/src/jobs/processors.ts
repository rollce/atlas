import { logger } from "../lib/logger.js";

export async function processJob(
  queueName: string,
  payload: unknown,
): Promise<void> {
  logger.info({ queueName, payload }, "Processing job");
}
