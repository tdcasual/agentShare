# Managed Redis Recovery Notes

This guide captures the minimum recovery expectations for `P3.2 Managed Redis`.

## Purpose

Document what recovery means for Redis-backed behavior in this application.

## What Redis Affects

- runtime coordination
- some session or short-lived state paths
- retry and concurrency protection behavior

## Recovery Questions

Before calling Redis migration complete, answer:

1. What data loss is acceptable for Redis-backed state?
2. What application behaviors fail closed when Redis is unavailable?
3. Which alerts fire when Redis is degraded?
4. Who owns Redis failover and persistence policy?

## Recovery Procedure

1. Detect degradation through alerts or smoke failure.
2. Confirm whether the issue is connectivity, failover, persistence loss, or saturation.
3. Restore Redis service health through the platform-owned recovery path.
4. Validate app reconnect behavior.
5. Re-run smoke checks and coordination-sensitive workflows.

## Evidence To Record

- incident time window
- failure mode
- recovery path used
- reconnect validation result
- owners involved
