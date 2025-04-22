#!/bin/bash

# Ensure script runs from project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit 1

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default to development mode
MODE="development"

# Process command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod)
      MODE="production"
      shift
      ;;
    --dev)
      MODE="development"
      shift
      ;;
    -h|--help)
      echo "Usage: ./local-dev.sh [--dev|--prod]"
      echo ""
      echo "Options:"
      echo "  --dev    Run in development mode with live code reloading (default)"
      echo "  --prod   Run in production mode without mounting local code"
      echo "  -h, --help  Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}Starting local environment in ${YELLOW}${MODE}${GREEN} mode${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${GREEN}Creating sample .env file...${NC}"
    cp .env.example .env 2>/dev/null || echo "# Environment Variables" > .env
    echo -e "${RED}Please configure your .env file before continuing.${NC}"
    exit 1
fi

# Set environment variables based on mode
if [ "$MODE" = "development" ]; then
    export ENVIRONMENT="development"
    export MOUNT_CODE="./:/app"
    export MOUNT_FRONTEND="./frontend:/app/frontend"
    export BACKEND_URL="http://localhost:8000"
    echo -e "${GREEN}Development mode: ${BLUE}Live code reloading enabled${NC}"
else
    export ENVIRONMENT="production"
    export MOUNT_CODE="."  # No code mounting in production
    export MOUNT_FRONTEND="."  # No code mounting in production
    export BACKEND_URL="http://localhost:8000"
    echo -e "${YELLOW}Production mode: ${BLUE}Running optimized containers without live reload${NC}"
fi

# Build and start containers
echo -e "${GREEN}Building and starting containers...${NC}"
docker-compose up --build -d

echo -e "${GREEN}Local environment is running!${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}Access your application at:${NC}"
echo -e "- Backend API: http://localhost:8000"
echo -e "- Frontend (Streamlit): http://localhost:8501"
echo -e "- Prometheus: http://localhost:9090"
echo -e "- Grafana: http://localhost:3000"
echo -e "- Alert Manager: http://localhost:9093"
echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}To view logs:${NC} docker-compose logs -f"
echo -e "${GREEN}To stop:${NC} docker-compose down" 