import documentWorker from './document.worker.js';
import logger from '../config/logger.js';
import connectDB from '../config/database.js';

const workers = [documentWorker];

async function startWorkers() {
  logger.info('Starting background workers...');

  // Connect to database
  await connectDB();

  // Workers start automatically when imported
  logger.info(`${workers.length} worker(s) started`);

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down workers...`);

    await Promise.all(
      workers.map(async (worker) => {
        await worker.close();
      })
    );

    logger.info('All workers stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorkers().catch((error) => {
  logger.error('Failed to start workers:', error);
  process.exit(1);
});

export { workers, startWorkers };
