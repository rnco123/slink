/**
 * Named PromQL behind GET /monitoring/metrics/:kind. The admin UI never sends
 * raw PromQL — it asks for a `kind` and the API maps it to a fixed, reviewed set
 * of instant queries. This keeps query cost bounded and prevents the browser
 * from driving arbitrary TSDB queries.
 *
 * PromQL sourced from infra/monitoring/docs/monitoring-api.md §1.
 */

export type MetricKind = "host" | "db" | "redis" | "containers"

export interface NamedQuery {
  key: string
  label: string
  unit: string
  query: string
}

const HOST: NamedQuery[] = [
  {
    key: "cpu_busy_pct",
    label: "CPU busy",
    unit: "%",
    query:
      '100 - (avg by (instance)(rate(node_cpu_seconds_total{mode="idle"}[5m]))*100)',
  },
  {
    key: "mem_used_pct",
    label: "Memory used",
    unit: "%",
    query:
      "(1 - node_memory_MemAvailable_bytes/node_memory_MemTotal_bytes)*100",
  },
  {
    // node-exporter runs with --path.rootfs=/host, which STRIPS the /host prefix
    // and reports the host root as mountpoint="/". (On Docker Desktop/WSL2 there
    // is no clean "/" mount, so this reads empty locally — a documented caveat —
    // but it is correct on the Linux staging/prod hosts.)
    key: "disk_free_pct",
    label: "Disk free (/)",
    unit: "%",
    query:
      'node_filesystem_avail_bytes{mountpoint="/",fstype!="tmpfs"}/node_filesystem_size_bytes{mountpoint="/",fstype!="tmpfs"}*100',
  },
  {
    key: "load1",
    label: "Load average (1m)",
    unit: "",
    query: "node_load1",
  },
]

const DB: NamedQuery[] = [
  { key: "up", label: "Postgres up", unit: "bool", query: "pg_up" },
  {
    key: "connections",
    label: "Active connections",
    unit: "",
    query: "sum(pg_stat_activity_count)",
  },
  {
    key: "commits_per_s",
    label: "Commits/s",
    unit: "/s",
    query: "sum(rate(pg_stat_database_xact_commit[5m]))",
  },
  {
    key: "rollbacks_per_s",
    label: "Rollbacks/s",
    unit: "/s",
    query: "sum(rate(pg_stat_database_xact_rollback[5m]))",
  },
]

const REDIS: NamedQuery[] = [
  { key: "up", label: "Redis up", unit: "bool", query: "redis_up" },
  {
    key: "mem_used_bytes",
    label: "Memory used",
    unit: "bytes",
    query: "redis_memory_used_bytes",
  },
  {
    key: "connected_clients",
    label: "Connected clients",
    unit: "",
    query: "redis_connected_clients",
  },
  {
    key: "commands_per_s",
    label: "Commands/s",
    unit: "/s",
    query: "rate(redis_commands_processed_total[5m])",
  },
]

const CONTAINERS: NamedQuery[] = [
  {
    key: "cpu_per_s",
    label: "Container CPU (cores)",
    unit: "cores",
    query:
      'sum by (name)(rate(container_cpu_usage_seconds_total{name!=""}[5m]))',
  },
  {
    key: "mem_bytes",
    label: "Container memory",
    unit: "bytes",
    query: 'sum by (name)(container_memory_usage_bytes{name!=""})',
  },
]

const CATALOG: Record<MetricKind, NamedQuery[]> = {
  host: HOST,
  db: DB,
  redis: REDIS,
  containers: CONTAINERS,
}

export const METRIC_KINDS = Object.keys(CATALOG) as MetricKind[]

export function isMetricKind(v: string): v is MetricKind {
  return (METRIC_KINDS as string[]).includes(v)
}

export function queriesFor(kind: MetricKind): NamedQuery[] {
  return CATALOG[kind]
}
