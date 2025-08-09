// Timeout handler utilities for serverless environments

const withTimeout = (promise, timeoutMs = 25000, errorMessage = 'Operation timeout') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on validation errors or client errors
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
};

const dbOperationWithTimeout = async (operation, timeoutMs = 20000) => {
  return withTimeout(
    withRetry(operation, 2, 500),
    timeoutMs,
    'Database operation timeout'
  );
};

module.exports = {
  withTimeout,
  withRetry,
  dbOperationWithTimeout
};
