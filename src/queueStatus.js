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

function normalizedRecipientName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

export function markQueueSentThroughRecipient(queue, statusMap, recipientName, createEntry = () => ({})) {
  const targetName = normalizedRecipientName(recipientName);
  const throughIndex = queue.findIndex((item) => normalizedRecipientName(item.name) === targetName);
  const nextStatusMap = { ...statusMap };
  if (throughIndex < 0) return { statusMap: nextStatusMap, throughIndex };

  queue.slice(0, throughIndex + 1).forEach((item, index) => {
    nextStatusMap[item.id] = {
      ...createEntry(item, index),
      status: 'Sent',
    };
  });
  return { statusMap: nextStatusMap, throughIndex };
}
