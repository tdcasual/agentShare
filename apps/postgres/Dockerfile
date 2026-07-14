FROM golang:1.26.5-bookworm AS gosu-builder

ARG GOPROXY=https://proxy.golang.org,direct
ENV GOPROXY=${GOPROXY}

RUN CGO_ENABLED=0 GOBIN=/out go install github.com/tianon/gosu@1.19 \
    && /out/gosu --version | grep -F "1.19 (go1.26.5"

FROM postgres:16

COPY --from=gosu-builder /out/gosu /usr/local/bin/gosu

RUN gosu --version | grep -F "1.19 (go1.26.5"
