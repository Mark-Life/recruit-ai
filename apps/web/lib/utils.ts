const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const formatRelativeDate = (date: string | Date): string => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / MS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / HOURS_PER_DAY);
  return `${days}d ago`;
};

/** Reads a streaming response body to completion, discarding the data. */
export const consumeStream = async (response: Response): Promise<void> => {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }
  for (;;) {
    const { done } = await reader.read();
    if (done) {
      break;
    }
  }
};
