#!/usr/bin/env sh

set -eu

: "${PUBLIC_HOST:?PUBLIC_HOST is required}"
APP_BASE_URL="${APP_BASE_URL:-https://${PUBLIC_HOST}}"

check_once() {
	if printf '%s' "${APP_BASE_URL}" | grep -q '^https://'; then
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			"${APP_BASE_URL}/healthz" >/dev/null
		curl --fail --silent --show-error --location \
			--resolve "${PUBLIC_HOST}:443:127.0.0.1" \
			"${APP_BASE_URL}/" >/dev/null
		return 0
	fi

	curl --fail --silent --show-error --location \
		-H "Host: ${PUBLIC_HOST}" \
		"${APP_BASE_URL}/healthz" >/dev/null
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
