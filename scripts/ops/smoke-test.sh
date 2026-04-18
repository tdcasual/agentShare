#!/usr/bin/env sh

set -eu

: "${PUBLIC_HOST:?PUBLIC_HOST is required}"
APP_BASE_URL="${APP_BASE_URL:-${PUBLIC_BASE_URL:-https://${PUBLIC_HOST}}}"

json_escape() {
	printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

create_metrics_cookie_jar() {
	if [ -n "${ACP_COOKIE_JAR:-}" ]; then
		if [ ! -f "${ACP_COOKIE_JAR}" ]; then
			echo "ACP_COOKIE_JAR points to a missing file: ${ACP_COOKIE_JAR}" >&2
			exit 1
		fi
		printf '%s' "${ACP_COOKIE_JAR}"
		return 0
	fi

	: "${ACP_ADMIN_EMAIL:?ACP_ADMIN_EMAIL or ACP_COOKIE_JAR is required for authenticated /metrics smoke checks}"
	: "${ACP_ADMIN_PASSWORD:?ACP_ADMIN_PASSWORD or ACP_COOKIE_JAR is required for authenticated /metrics smoke checks}"

	cookie_jar="$(mktemp)"
	login_payload="$(printf '{"email":"%s","password":"%s"}' \
		"$(json_escape "${ACP_ADMIN_EMAIL}")" \
		"$(json_escape "${ACP_ADMIN_PASSWORD}")")"

	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			--cookie-jar "${cookie_jar}" \
			-H 'Content-Type: application/json' \
			-X POST \
			-d "${login_payload}" \
			"${APP_BASE_URL}/api/session/login" >/dev/null
	else
		curl --fail --silent --show-error --location \
			-H "Host: ${PUBLIC_HOST}" \
			--cookie-jar "${cookie_jar}" \
			-H 'Content-Type: application/json' \
			-X POST \
			-d "${login_payload}" \
			"${APP_BASE_URL}/api/session/login" >/dev/null
	fi

	printf '%s' "${cookie_jar}"
}

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
	cookie_jar="$(create_metrics_cookie_jar)"
	cleanup_cookie_jar=0
	if [ "${cookie_jar}" != "${ACP_COOKIE_JAR:-}" ]; then
		cleanup_cookie_jar=1
	fi
	cleanup_metrics_signal() {
		rm -f "${metrics_file}"
		if [ "${cleanup_cookie_jar}" -eq 1 ]; then
			rm -f "${cookie_jar}"
		fi
	}
	trap 'cleanup_metrics_signal' EXIT INT TERM

	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			--cookie "${cookie_jar}" \
			"${APP_BASE_URL}/metrics" >"${metrics_file}"
	else
		curl --fail --silent --show-error --location \
			-H "Host: ${PUBLIC_HOST}" \
			--cookie "${cookie_jar}" \
			"${APP_BASE_URL}/metrics" >"${metrics_file}"
	fi

	grep -q 'agent_control_plane_http_requests_total{' "${metrics_file}"
	grep -q 'agent_control_plane_http_errors_total' "${metrics_file}"
	grep -q 'agent_control_plane_management_session_logins_total' "${metrics_file}"
	grep -q 'agent_control_plane_management_session_logouts_total' "${metrics_file}"
	grep -q 'agent_control_plane_approval_approvals_total' "${metrics_file}"
	cleanup_metrics_signal
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
