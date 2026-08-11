const globalForRateLimit = globalThis;

if (!globalForRateLimit.rateLimitMap) {
  globalForRateLimit.rateLimitMap = new Map();
}

const limitMap = globalForRateLimit.rateLimitMap;

// Clean up expired entries to avoid memory leaks
if (!globalForRateLimit.rateLimitCleanupInterval) {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of limitMap.entries()) {
      if (now > value.windowEnd) {
        limitMap.delete(key);
      }
    }
  };
  globalForRateLimit.rateLimitCleanupInterval = setInterval(cleanup, 5 * 60 * 1000);
  if (globalForRateLimit.rateLimitCleanupInterval.unref) {
    globalForRateLimit.rateLimitCleanupInterval.unref();
  }
}

/**
 * Checks if a request from an IP is within the rate limits.
 * @param {string} ip - The client's IP address.
 * @param {number} limit - Maximum requests allowed in the window.
 * @param {number} windowMs - Window duration in milliseconds.
 * @returns {{success: boolean, remaining: number, limit: number}}
 */
export function rateLimit(ip, limit = 30, windowMs = 60 * 1000) {
  const now = Date.now();
  const key = `${ip}`;
  
  const record = limitMap.get(key);
  
  if (!record) {
    limitMap.set(key, {
      count: 1,
      windowEnd: now + windowMs
    });
    return { success: true, remaining: limit - 1, limit };
  }
  
  if (now > record.windowEnd) {
    record.count = 1;
    record.windowEnd = now + windowMs;
    return { success: true, remaining: limit - 1, limit };
  }
  
  record.count++;
  const remaining = Math.max(0, limit - record.count);
  
  if (record.count > limit) {
    return { success: false, remaining: 0, limit };
  }
  
  return { success: true, remaining, limit };
}
