type ProxyApiEnv = {
  BACKEND_API_URL?: string;
  AGENT_CONTROL_PLANE_API_URL?: string;
};

export function resolveApiBaseUrl(env: ProxyApiEnv = process.env as ProxyApiEnv): string {
  return env.BACKEND_API_URL || env.AGENT_CONTROL_PLANE_API_URL || 'http://localhost:8000';
}
