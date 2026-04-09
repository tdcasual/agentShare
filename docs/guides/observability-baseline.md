# Observability Baseline

This guide defines the minimum observability baseline for `P3.4 Centralized Observability And Incident Flow`.

## Required Signals

- application health
- deployment health
- request volume and failure rate
- Postgres health
- Redis health
- secret backend health
- backup success and failure

## Required Dashboards

- release health dashboard
- application request health dashboard
- governance activity dashboard
- data-service health dashboard
- secret-backend health dashboard

## Required Alerts

- deploy failed
- `/healthz` failed
- request failure spike
- Postgres saturation or connectivity failure
- Redis instability
- secret backend unreachable
- backup failure

## Alert Ownership

Every alert must name:

- first responder
- escalation destination
- rollback owner if a rollback might be required

## Minimum Repository Expectation

This repository should continue to provide:

- health endpoints
- metrics emission
- smoke checks
- request correlation guidance

Centralized routing, dashboards, and paging are platform-owned.
