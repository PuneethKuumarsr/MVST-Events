export function queueCounts(queue, statusMap) {
  const total = queue.length;
  const sent = queue.filter((item) => statusMap[item.id]?.status === 'Sent').length;
  const prepared = queue.filter((item) => statusMap[item.id]?.status === 'Prepared').length;
  const skipped = queue.filter((item) => statusMap[item.id]?.status === 'Skipped').length;
  const failed = queue.filter((item) => statusMap[item.id]?.status === 'Failed').length;
  return { total, sent, prepared, skipped, failed, remaining: Math.max(total - sent - prepared - skipped - failed, 0) };
}

export function firstPendingQueueIndex(queue, statusMap) {
  return queue.findIndex((item) => !['Sent', 'Prepared', 'Skipped'].includes(statusMap[item.id]?.status));
}
