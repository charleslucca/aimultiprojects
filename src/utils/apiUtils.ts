import { supabase } from "@/integrations/supabase/client";

interface FetchWithTimeoutOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RetryError extends Error {
  constructor(message: string, public attempts: number) {
    super(message);
    this.name = 'RetryError';
  }
}

export const fetchWithTimeout = async (
  url: string, 
  options: RequestInit, 
  config: FetchWithTimeoutOptions = {}
): Promise<Response> => {
  const { timeoutMs = 25000, retries = 2, retryDelayMs = 1000 } = config;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error as Error;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = new TimeoutError(`Request timed out after ${timeoutMs}ms`);
        }
      }
      
      // Don't retry on the last attempt
      if (attempt < retries) {
        console.log(`Attempt ${attempt + 1} failed, retrying in ${retryDelayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  
  throw new RetryError(`Failed after ${retries + 1} attempts: ${lastError.message}`, retries + 1);
};

export const invokeSupabaseFunctionWithTimeout = async (
  functionName: string,
  body: any,
  config: FetchWithTimeoutOptions = {}
): Promise<any> => {
  const { timeoutMs = 30000, retries = 2, retryDelayMs = 2000 } = config;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const startTime = Date.now();
      
      const { data, error } = await Promise.race([
        supabase.functions.invoke(functionName, { body }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new TimeoutError(`Function call timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]) as { data: any; error: any };
      
      const duration = Date.now() - startTime;
      console.log(`Function ${functionName} completed in ${duration}ms`);
      
      if (error) {
        throw new Error(error.message || 'Function execution failed');
      }
      
      return data;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error && error.message.includes('not configured')) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        console.log(`Function ${functionName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new RetryError(`Function ${functionName} failed after ${retries + 1} attempts: ${lastError.message}`, retries + 1);
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
};