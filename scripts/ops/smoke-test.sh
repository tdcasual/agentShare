#!/usr/bin/env sh

set -eu

: "${PUBLIC_HOST:?PUBLIC_HOST is required}"
APP_BASE_URL="${APP_BASE_URL:-${PUBLIC_BASE_URL:-https://${PUBLIC_HOST}}}"

check_health_headers() {
	headers_file="$(mktemp)"
	trap 'rm -f "${headers_file}"' EXIT INT TERM

	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			-D "${headers_file}" \
			"${APP_BASE_URL}/healthz" >/dev/null
	else
		curl --fail --silent --show-error --location \
			-H "Host: ${PUBLIC_HOST}" \
			-D "${headers_file}" \
			"${APP_BASE_URL}/healthz" >/dev/null
	fi

	grep -iq '^x-request-id:' "${headers_file}"
	rm -f "${headers_file}"
	trap - EXIT INT TERM
}

check_metrics_signal() {
	metrics_file="$(mktemp)"
	trap 'rm -f "${metrics_file}"' EXIT INT TERM

	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			"${APP_BASE_URL}/metrics" >"${metrics_file}"
	else
		curl --fail --silent --show-error --location \
			-H "Host: ${PUBLIC_HOST}" \
			"${APP_BASE_URL}/metrics" >"${metrics_file}"
	fi

	grep -q 'agent_control_plane_http_requests_total{' "${metrics_file}"
	grep -q 'agent_control_plane_http_errors_total' "${metrics_file}"
	grep -q 'agent_control_plane_management_session_logins_total' "${metrics_file}"
	grep -q 'agent_control_plane_management_session_logouts_total' "${metrics_file}"
	grep -q 'agent_control_plane_approval_approvals_total' "${metrics_file}"
	rm -f "${metrics_file}"
	trap - EXIT INT TERM
}

check_once() {
	check_health_headers
	check_metrics_signal

	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			"${APP_BASE_URL}/" >/dev/null
		return 0
	fi

	curl --fail --silent --show-error --location \
		-H "Host: ${PUBLIC_HOST}" \
		"${APP_BASE_URL}/" >/dev/null
}

attempt=1
while [ "${attempt}" -le 10 ]; do
	if check_once; then
		exit 0
	fi
	sleep 3
	attempt=$((attempt + 1))
done

echo "Smoke check failed for ${APP_BASE_URL}" >&2
exit 1
