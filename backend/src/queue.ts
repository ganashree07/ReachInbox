import { Queue } from 'bullmq';
import { redis } from './redis';
import { JobData } from './types';

export const emailQueue = new Queue<JobData>('emailQueue', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: false, // keep completed jobs visible in Bull Board
    removeOnFail: false,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});
