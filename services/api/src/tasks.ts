import type { StoryBuildJob } from '@just-imagine/protocol';
import { CloudTasksClient } from '@google-cloud/tasks';
export function deletionQueue(config: {
  project: string;
  queue: string;
  url: string;
  serviceAccount: string;
}) {
  const client = new CloudTasksClient();
  return {
    async enqueue(id: string) {
      const parent = client.queuePath(config.project, 'us-central1', config.queue);
      await client.createTask({
        parent,
        task: {
          httpRequest: {
            httpMethod: 'POST',
            url: `${config.url}/internal/deletions/${id}`,
            headers: { 'content-type': 'application/json' },
            body: Buffer.from('{}'),
            oidcToken: { serviceAccountEmail: config.serviceAccount, audience: config.url },
          },
          dispatchDeadline: { seconds: 300 },
        },
      });
    },
  };
}

export function storyQueue(config: {
  project: string;
  queue: string;
  url: string;
  serviceAccount: string;
}) {
  const client = new CloudTasksClient();
  return async (job: StoryBuildJob) => {
    const parent = client.queuePath(config.project, 'us-central1', config.queue);
    try {
      await client.createTask({
        parent,
        task: {
          name: `${parent}/tasks/${job.jobId}`,
          dispatchDeadline: { seconds: 1800 },
          httpRequest: {
            httpMethod: 'POST',
            url: `${config.url}/jobs`,
            headers: { 'content-type': 'application/json' },
            body: Buffer.from(JSON.stringify(job)),
            oidcToken: { serviceAccountEmail: config.serviceAccount, audience: config.url },
          },
        },
      });
    } catch (e) {
      if (!e || typeof e !== 'object' || !('code' in e) || e.code !== 6) throw e;
    }
  };
}
