FROM golang:1.26.5-bookworm@sha256:1ecb7edf62a0408027bd5729dfd6b1b8766e578e8df93995b225dfd0944eb651 AS gosu-builder

ARG GOPROXY=https://proxy.golang.org,direct
ENV GOPROXY=${GOPROXY}

RUN CGO_ENABLED=0 GOBIN=/out go install github.com/tianon/gosu@1.19 \
    && /out/gosu --version | grep -F "1.19 (go1.26.5"

FROM postgres:16@sha256:33f923b05f64ca54ac4401c01126a6b92afe839a0aa0a52bc5aeb5cc958e5f20

COPY --from=gosu-builder /out/gosu /usr/local/bin/gosu

RUN gosu --version | grep -F "1.19 (go1.26.5" \
    && install -d -o postgres -g postgres /var/lib/postgresql/wal-archive
