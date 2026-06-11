/**
 * Tests if a specific channel URL is online.
 * Bypasses CORS block checking using 'no-cors' mode which resolves if the server is reachable.
 * 
 * @param {string} url 
 * @param {number} timeoutMs 
 * @returns {Promise<boolean>} True if online, False if offline/timeout
 */
export async function testChannelUrl(url, timeoutMs = 3500) {
  if (!url) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // We use mode: 'no-cors'. This makes fetch resolve with status 0 if reachable.
    // If the server is offline or doesn't exist, it will throw a TypeError (Network Error).
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return true; // Reached the server successfully!
  } catch (err) {
    clearTimeout(timeoutId);
    return false; // Connection failed or timed out
  }
}

/**
 * Tests an array of channels in parallel batches.
 * Returns a controller object that allows canceling the ongoing tests.
 * 
 * @param {Array} channels Array of channel objects
 * @param {Function} onProgress Callback called as each channel is verified: (channelId, status)
 * @param {Function} onComplete Callback when all channels are verified
 * @param {number} batchSize How many requests to send in parallel
 * @returns {Object} { cancel: Function }
 */
export function testChannelsBatch(channels, onProgress, onComplete, batchSize = 6) {
  let isCancelled = false;
  let currentIndex = 0;

  async function runBatch() {
    if (isCancelled || currentIndex >= channels.length) {
      if (onComplete) onComplete();
      return;
    }

    const batch = channels.slice(currentIndex, currentIndex + batchSize);
    currentIndex += batchSize;

    const promises = batch.map(async (channel) => {
      if (isCancelled) return;
      
      onProgress(channel.id, 'checking');
      
      const isOnline = await testChannelUrl(channel.url);
      
      if (!isCancelled) {
        onProgress(channel.id, isOnline ? 'online' : 'offline');
      }
    });

    await Promise.all(promises);
    
    // Call next batch
    setTimeout(runBatch, 50);
  }

  // Trigger first batch
  runBatch();

  return {
    cancel: () => {
      isCancelled = true;
    }
  };
}
