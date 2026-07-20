FROM golang:1.26.5-alpine3.23@sha256:622e56dbc11a8cfe87cafa2331e9a201877271cbff918af53d3be315f3da88cc AS builder

ARG GOPROXY=https://proxy.golang.org,direct
ENV GOPROXY=${GOPROXY}

RUN CGO_ENABLED=0 go install -trimpath -ldflags="-s -w" \
    github.com/caddyserver/caddy/v2/cmd/caddy@v2.11.4

FROM alpine:3.23@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40

ARG ALPINE_MIRROR=https://dl-cdn.alpinelinux.org

RUN sed -i "s#https://dl-cdn.alpinelinux.org#${ALPINE_MIRROR}#g" /etc/apk/repositories \
    && apk upgrade --no-cache \
    && apk add --no-cache ca-certificates tzdata \
    && mkdir -p /data /config /etc/caddy

COPY --from=builder /go/bin/caddy /usr/bin/caddy

ENV XDG_CONFIG_HOME=/config \
    XDG_DATA_HOME=/data

VOLUME ["/data", "/config"]

EXPOSE 80 443 443/udp 2019

STOPSIGNAL SIGQUIT

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
