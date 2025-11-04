#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 [-n image_name] [-t tag] [--push]

Builds the custom postgres image (with aws_s3 extension) and optionally pushes
it to a registry.

Options:
  -n  Image name (default: python-whatsapp-bot-postgres)
  -t  Image tag (default: latest)
  --push  Push the image after building
  -h  Show this help message

Environment overrides:
  REGISTRY - prepend registry (e.g., ghcr.io/your-org)
  DOCKER   - Docker CLI binary to use (default: docker)
USAGE
}

IMAGE_NAME="python-whatsapp-bot-postgres"
IMAGE_TAG="latest"
PUSH_IMAGE=0
DOCKER_CLI="${DOCKER:-docker}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n)
      IMAGE_NAME="$2"
      shift 2
      ;;
    -t)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --push)
      PUSH_IMAGE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v "$DOCKER_CLI" >/dev/null 2>&1; then
  echo "Docker CLI not found: $DOCKER_CLI" >&2
  exit 1
fi

IMAGE_REF="$IMAGE_NAME"
if [ -n "${REGISTRY:-}" ]; then
  IMAGE_REF="${REGISTRY%/}/$IMAGE_REF"
fi
IMAGE_REF="$IMAGE_REF:$IMAGE_TAG"

echo "==> Building $IMAGE_REF"
"$DOCKER_CLI" build \
  -f docker/postgres/Dockerfile \
  -t "$IMAGE_REF" \
  .

if [ "$PUSH_IMAGE" -eq 1 ]; then
  echo "==> Pushing $IMAGE_REF"
  "$DOCKER_CLI" push "$IMAGE_REF"
fi

echo "==> Done"

