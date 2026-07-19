# Monitoring and Alerting

The alert rules in `ops/monitoring/vaultgate-alerts.yml` are ready to load into Prometheus but
depend on three exporters that are not part of the application stack. This guide covers the
exporters, a minimal `prometheus.yml`, Alertmanager wiring, and how to test the alert chain.

## Alert rules and required metrics

| Alert | Severity | Expression | Metric source |
|---|---|---|---|
| `VaultGateReadinessDown` | critical | `probe_success{job="vaultgate-readyz"} == 0` for 2m | blackbox exporter probing `/readyz` |
| `VaultGatePostgresDown` | critical | `pg_up{job="vaultgate-postgres"} == 0` for 1m | postgres exporter |
| `VaultGatePostgresDiskPressure` | warning | filesystem usage over 80% on mountpoints matching `.*vaultgate.*` for 10m | node exporter |
| `VaultGatePostgresReplicationLag` | warning | `pg_replication_lag_seconds{job="vaultgate-postgres"} > 30` for 5m | postgres exporter (replication lag query) |
| `VaultGateWalArchiveFailures` | critical | `increase(pg_stat_archiver_failed_count{job="vaultgate-postgres"}[15m]) > 0` for 1m | postgres exporter |

The `job` label values in the expressions must match the scrape configuration exactly:
`vaultgate-readyz` for the blackbox probe and `vaultgate-postgres` for the postgres exporter.

## Exporters

### Blackbox exporter (HTTP probe)

Probes `https://PUBLIC_HOST/readyz` from the Prometheus host so the check covers DNS, TLS, Caddy,
the web/API path, database connectivity, and the encryption round trip. `/readyz` returns HTTP 503
when any check is degraded, which turns `probe_success` to `0`; `/healthz` is a shallow liveness
probe and is intentionally not alerted on. Minimal `blackbox.yml`:

```yaml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_status_codes: [200]
      preferred_ip_protocol: ip4
```

Run it as `prom/blackbox-exporter` beside Prometheus (no VaultGate network access needed beyond
the public URL).

### Postgres exporter

Run `prometheuscommunity/postgres-exporter` with `DATA_SOURCE_NAME` pointing at the VaultGate
database:

- Embedded stack: attach the exporter container to the compose `data` network and use
  `postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/vaultgate?sslmode=disable`.
- External managed database: reuse the `DATABASE_URL` connection string (keep
  `sslmode=verify-full`).

`pg_up` and `pg_stat_archiver_failed_count` come from the exporter's built-in collectors.
`pg_replication_lag_seconds` is not a stock metric: ship a custom query (via
`--extend.query-path` or `PG_EXPORTER_EXTEND_QUERY_PATH`) that computes replay lag in seconds on
the primary, and decide the no-replica semantics up front — report `0` when no standby is
connected, otherwise stacks without replicas alert permanently. Keep
`REQUIRE_POSTGRES_REPLICA=true` in `scripts/ops/check-postgres-durability.sh` when replicas are
expected so the durability check and this alert agree.

### Node exporter

Run `prom/node-exporter` on the Docker host with the host root mounted (`--path.rootfs=/host`).
The disk-pressure alert matches mountpoints containing `vaultgate`. Default named volumes mount
under `/var/lib/docker/volumes/vaultgate_postgres-data/_data`, which matches; when
`POSTGRES_DATA_LOCATION` or `POSTGRES_WAL_ARCHIVE_LOCATION` point elsewhere, make sure the path
still contains `vaultgate` or adjust the expression's regex.

## Minimal prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - /etc/prometheus/vaultgate-alerts.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

scrape_configs:
  - job_name: vaultgate-readyz
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets: ["https://vaultgate.example.com/readyz"]  # PUBLIC_HOST
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox:9115

  - job_name: vaultgate-postgres
    static_configs:
      - targets: ["postgres-exporter:9187"]

  - job_name: vaultgate-node
    static_configs:
      - targets: ["node-exporter:9100"]
```

Copy `ops/monitoring/vaultgate-alerts.yml` to `/etc/prometheus/vaultgate-alerts.yml` (the deploy
workflow already uploads it to the deployment directory) and validate before loading:

```bash
promtool check rules ops/monitoring/vaultgate-alerts.yml
```

## Alertmanager

Any Alertmanager receiver works (email, webhook, chat). Route on the `severity` label the rules
set:

```yaml
route:
  receiver: default
  routes:
    - matchers: [severity = "critical"]
      receiver: oncall
receivers:
  - name: default
    webhook_configs:
      - url: "http://example.invalid/alerts"
  - name: oncall
    webhook_configs:
      - url: "http://example.invalid/oncall"
```

Keep `critical` alerts (`VaultGateReadinessDown`, `VaultGatePostgresDown`,
`VaultGateWalArchiveFailures`) on a path that wakes someone up; data durability degrades silently
without them.

## Testing the alert chain

On a staging stack (never on production — this stops the database):

1. Confirm targets are up in Prometheus (`Status → Targets`) and rules are loaded.
2. Stop the database: `docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml stop postgres`.
3. Within about 1 minute `VaultGatePostgresDown` fires (`pg_up == 0`); within about 2 minutes
   `VaultGateReadinessDown` fires because `/readyz` starts returning 503.
4. Confirm the notification arrives at the Alertmanager receiver.
5. Restart and confirm both alerts resolve:
   `docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml start postgres`.

For a non-destructive probe-only test, point the blackbox target at an unreachable URL and watch
`probe_success` drop to `0`.

## Related operational checks

Alerting complements, and does not replace, the scripted checks in
[`production-operations.md`](production-operations.md): `check-postgres-durability.sh` (durability
settings, WAL archival, disk/inode usage) and `verify-key-recovery.sh` (encryption keyring audit).
Run both from cron or systemd timers and alert on non-zero exit. For investigation procedures once
an alert fires, see [`troubleshooting.md`](troubleshooting.md).
