FROM golang:1.26-alpine AS build
WORKDIR /src
COPY apps/server/go.mod apps/server/go.sum ./
RUN go mod download
COPY apps/server/ ./
RUN CGO_ENABLED=0 go build -o /bin/server . \
    && CGO_ENABLED=0 go build -o /bin/dropdb ./cmd/dropdb

FROM alpine:3.22
RUN apk add --no-cache ca-certificates wget
COPY --from=build /bin/server /usr/local/bin/server
COPY --from=build /bin/dropdb /usr/local/bin/dropdb
EXPOSE 3000
CMD ["server"]
