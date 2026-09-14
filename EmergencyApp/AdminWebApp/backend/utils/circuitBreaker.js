// utils/circuitBreaker.js
/**
 * Lightweight Circuit Breaker pattern implementation.
 * Protects server event loop and prevents request starvation when external AI/geocoding APIs degrade.
 */
class CircuitBreaker {
  constructor(name = 'Service', options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3; // Consecutive failures before opening
    this.cooldownMs = options.cooldownMs || 30000;         // 30 seconds cooldown
    this.timeoutMs = options.timeoutMs || 2500;            // 2.5s timeout per execution
    
    this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF-OPEN'
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  async execute(primaryFn, fallbackFn = null) {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now > this.nextAttemptTime) {
        this.state = 'HALF-OPEN';
        console.log(`🟡 [CircuitBreaker:${this.name}] Transitioning to HALF-OPEN, attempting canary request.`);
      } else {
        console.warn(`⚡ [CircuitBreaker:${this.name}] Circuit is OPEN (bypassing call, using fast fallback).`);
        if (fallbackFn) return await fallbackFn(new Error(`CircuitBreaker for ${this.name} is OPEN`));
        return null;
      }
    }

    try {
      // Execute with timeout promise race
      const result = await Promise.race([
        primaryFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${this.name} request timed out (${this.timeoutMs}ms)`)), this.timeoutMs)
        )
      ]);

      // Success in CLOSED or HALF-OPEN resets breaker
      if (this.state === 'HALF-OPEN') {
        console.log(`✅ [CircuitBreaker:${this.name}] Canary call succeeded, resetting circuit to CLOSED.`);
      }
      this.state = 'CLOSED';
      this.failureCount = 0;
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      console.warn(`⚠️ [CircuitBreaker:${this.name}] Call failed (${this.failureCount}/${this.failureThreshold}): ${err.message}`);

      if (this.failureCount >= this.failureThreshold || this.state === 'HALF-OPEN') {
        this.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.cooldownMs;
        console.error(`🚨 [CircuitBreaker:${this.name}] Threshold exceeded! Circuit is now OPEN for ${this.cooldownMs / 1000}s.`);
      }

      if (fallbackFn) {
        return await fallbackFn(err);
      }
      return null;
    }
  }
}

module.exports = CircuitBreaker;
