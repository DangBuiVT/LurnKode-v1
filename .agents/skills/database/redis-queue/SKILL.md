---
name: redis-queue
description: Hướng dẫn sử dụng Redis queue (BullMQ cho Node.js / Celery cho Python) cho submission worker của DevVerse Judge system. Bao gồm job lifecycle, retry logic, dead letter queue, và concurrent worker scaling.
---

# Redis Queue Skill — DevVerse Submission Worker

## Kiến trúc submission pipeline

```
Student submits code
    ↓ API Server
POST /submissions → validate → enqueue job
    ↓ Redis (BullMQ/Celery)
Queue: "code-submissions"
    ↓ Worker
Pull job → call Judge0 API → store result
    ↓ Supabase
UPDATE submissions SET status='accepted', result=...
    ↓ WebSocket / Polling
Frontend nhận kết quả real-time
```

## Option A: BullMQ (Node.js)

### Setup

```typescript
import { Queue, Worker, Job } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
}

// Queue definition
export const submissionQueue = new Queue('code-submissions', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

// Enqueue submission
export async function enqueueSubmission(submissionId: string) {
  await submissionQueue.add(
    'process-submission',
    { submissionId },
    { jobId: submissionId }  // prevent duplicates
  )
}
```

### Worker

```typescript
const worker = new Worker(
  'code-submissions',
  async (job: Job) => {
    const { submissionId } = job.data

    // 1. Fetch submission từ Supabase
    const { data: submission } = await supabase
      .from('submissions')
      .select('*, problem(*)')
      .eq('id', submissionId)
      .single()

    // 2. Update status → running
    await supabase.from('submissions')
      .update({ status: 'running' })
      .eq('id', submissionId)

    // 3. Call Judge0
    const result = await judge0.submitAndWait({
      source_code: submission.code,
      language_id: submission.language_id,
      stdin: submission.problem.test_input,
      expected_output: submission.problem.expected_output,
      cpu_time_limit: 2.0,    // 2 seconds
      memory_limit: 256000,   // 256MB in KB
    })

    // 4. Store result
    await supabase.from('submissions').update({
      status: result.status.description.toLowerCase(),
      execution_time: result.time,
      memory_used: result.memory,
      stdout: result.stdout,
      stderr: result.stderr,
      result_id: result.token,
    }).eq('id', submissionId)
  },
  {
    connection,
    concurrency: 5,   // 5 parallel workers
  }
)

// Error handling
worker.on('failed', async (job, err) => {
  console.error(`Job ${job?.id} failed:`, err)
  if (job?.data.submissionId) {
    await supabase.from('submissions')
      .update({ status: 'error', error_message: err.message })
      .eq('id', job.data.submissionId)
  }
})
```

## Option B: Celery (Python/FastAPI)

```python
from celery import Celery
import redis

celery_app = Celery(
    "devverse",
    broker=f"redis://{REDIS_HOST}:{REDIS_PORT}/0",
    backend=f"redis://{REDIS_HOST}:{REDIS_PORT}/1",
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    task_acks_late=True,      # re-queue if worker dies
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,   # fair distribution
    task_time_limit=30,      # hard limit 30s
    task_soft_time_limit=25, # soft limit → raise exception
)

@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=2,
    name="process_submission"
)
def process_submission(self, submission_id: str):
    try:
        # 1. Fetch + 2. Run Judge0 + 3. Store result
        ...
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

## Dead Letter Queue (failed jobs)

```typescript
// Monitor failed jobs
const failedJobs = await submissionQueue.getFailed(0, 100)

// Retry tất cả failed jobs
for (const job of failedJobs) {
  await job.retry()
}
```

## Health monitoring

```typescript
// Check queue health
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    submissionQueue.getWaitingCount(),
    submissionQueue.getActiveCount(),
    submissionQueue.getCompletedCount(),
    submissionQueue.getFailedCount(),
  ])
  return { waiting, active, completed, failed }
}
```

## Khi nào activate skill này

- Implement submission pipeline
- Debug stuck/failed jobs
- Scale worker concurrency
- Monitor queue backlog
- Handle timeout/error cases
