#!/usr/bin/env sh

set -eu

: "${PUBLIC_HOST:?PUBLIC_HOST is required}"
APP_BASE_URL="${APP_BASE_URL:-${PUBLIC_BASE_URL:-https://${PUBLIC_HOST}}}"

_check_health() {
	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			"${APP_BASE_URL}/healthz" >/dev/null
	else
		curl --fail --silent --show-error --location \
			-H "Host: ${PUBLIC_HOST}" \
			"${APP_BASE_URL}/healthz" >/dev/null
	fi
}

_check_request_id_header() {
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

_check_readyz() {
	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			"${APP_BASE_URL}/readyz" >/dev/null
	else
		curl --fail --silent --show-error --location \
			-H "Host: ${PUBLIC_HOST}" \
			"${APP_BASE_URL}/readyz" >/dev/null
	fi
}

_check_homepage() {
	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			"${APP_BASE_URL}/" >/dev/null
	else
		curl --fail --silent --show-error --location \
			-H "Host: ${PUBLIC_HOST}" \
			"${APP_BASE_URL}/" >/dev/null
	fi
}

_request_status() {
	path="$1"
	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			--output /dev/null --write-out '%{http_code}' \
			"${APP_BASE_URL}${path}"
	else
		curl --silent --show-error --location \
			-H "Host: ${PUBLIC_HOST}" \
			--output /dev/null --write-out '%{http_code}' \
			"${APP_BASE_URL}${path}"
	fi
}

_check_api_contract() {
	bootstrap_status="$(_request_status /api/admin/bootstrap/status)"
	[ "${bootstrap_status}" = "200" ]

	session_status="$(_request_status /api/admin/session)"
	[ "${session_status}" = "401" ]
}

check_once() {
	_check_health
	_check_request_id_header
	_check_readyz
	_check_homepage
	_check_api_contract
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
