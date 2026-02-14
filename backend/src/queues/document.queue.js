import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import logger from '../config/logger.js';

// Document processing queue
export const documentQueue = new Queue('document-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
export const documentQueueEvents = new QueueEvents('document-processing', {
  connection: redisConnection,
});

documentQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info(`Document job ${jobId} completed`, { result: returnvalue });
});

documentQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Document job ${jobId} failed`, { reason: failedReason });
});

documentQueueEvents.on('progress', ({ jobId, data }) => {
  logger.debug(`Document job ${jobId} progress: ${data}%`);
});

// Job types
export const JobTypes = {
  PROCESS_DOCUMENT: 'process-document',
  DELETE_DOCUMENT: 'delete-document',
};

/**
 * Add a document processing job
 */
export const addDocumentJob = async (type, data, options = {}) => {
  const job = await documentQueue.add(type, data, {
    priority: options.priority || 0,
    ...options,
  });
  logger.info(`Added job ${job.id} of type ${type}`);
  return job;
};

/**
 * Get job status
 */
export const getJobStatus = async (jobId) => {
  const job = await documentQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
};
