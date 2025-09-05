#!/bin/bash

# Deployment script for Ramesh Traders Backend
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
IMAGE_NAME="rameshtraders-be"
BUILD_NUMBER=${BUILD_NUMBER:-$(date +%s)}

echo -e "${GREEN}🚀 Starting deployment to ${ENVIRONMENT}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    echo -e "${YELLOW}📄 Loading environment variables from .env.${ENVIRONMENT}${NC}"
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    echo -e "${YELLOW}📄 Loading environment variables from .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ No environment file found${NC}"
    exit 1
fi

# Build and tag Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER} .
docker tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest

# Push to registry (if not local)
if [ "$DOCKER_REGISTRY" != "localhost" ]; then
    echo -e "${YELLOW}📤 Pushing image to registry...${NC}"
    docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER}
    docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
fi

# Deploy based on environment
case $ENVIRONMENT in
    "staging")
        echo -e "${YELLOW}🚀 Deploying to staging...${NC}"
        docker-compose -f docker-compose.yml up -d
        ;;
    "production")
        echo -e "${YELLOW}🚀 Deploying to production...${NC}"
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    "kubernetes")
        echo -e "${YELLOW}🚀 Deploying to Kubernetes...${NC}"
        kubectl apply -f k8s/
        ;;
    *)
        echo -e "${RED}❌ Unknown environment: ${ENVIRONMENT}${NC}"
        echo "Usage: $0 [staging|production|kubernetes]"
        exit 1
        ;;
esac

# Health check
echo -e "${YELLOW}🏥 Performing health check...${NC}"
sleep 10

if curl -f http://localhost:4001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Application is running at http://localhost:4001${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

