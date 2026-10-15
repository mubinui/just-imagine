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
