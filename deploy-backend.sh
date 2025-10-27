#!/bin/bash
set -e

# Birthday Reminder Backend Deployment Script
# This script deploys the backend to Google Cloud Platform

echo "🚀 Birthday Reminder Backend Deployment"
echo "========================================"

# Configuration
PROJECT_ID="birthday-reminder-475716"
REGION="us-central1"
APP_NAME="birthday-reminder"

# Set up service account credentials
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GOOGLE_APPLICATION_CREDENTIALS="${SCRIPT_DIR}/gcp-service-account.json"

if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "❌ Error: Service account key not found at $GOOGLE_APPLICATION_CREDENTIALS"
  exit 1
fi

echo "🔑 Using service account: $GOOGLE_APPLICATION_CREDENTIALS"

# Authenticate gcloud with the service account
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"

# Set the project
echo "📋 Setting GCP project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Step 1: Initialize Terraform (if not already done)
echo ""
echo "1️⃣  Initializing Terraform..."
cd terraform
if [ ! -d ".terraform" ]; then
  terraform init
else
  echo "✓ Terraform already initialized"
fi

# Step 2: Deploy infrastructure with Terraform
echo ""
echo "2️⃣  Deploying infrastructure with Terraform..."
echo "This will create/update:"
echo "  - VPC and networking"
echo "  - Cloud SQL PostgreSQL instance"
echo "  - Artifact Registry"
echo "  - Service accounts and IAM roles"
echo "  - VPC Connector"
echo "  - Pub/Sub topic"
echo "  - Cloud Scheduler job"
echo ""

terraform apply -auto-approve

# Get outputs from Terraform
DB_INSTANCE=$(terraform output -raw database_connection_name)
REPO_URL=$(terraform output -raw artifact_registry_url)

echo ""
echo "✓ Infrastructure deployed successfully"
echo "  Database: $DB_INSTANCE"
echo "  Docker repo: $REPO_URL"

# Step 3: Build and push Docker image
echo ""
echo "3️⃣  Building and pushing Docker image..."
cd ..

# Configure Docker for Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Detect if using podman or docker
if command -v podman &> /dev/null; then
  CONTAINER_CMD="podman"
else
  CONTAINER_CMD="docker"
fi

# Build the image for AMD64 (required for Cloud Run)
echo "Building Docker image for linux/amd64 using ${CONTAINER_CMD}..."
${CONTAINER_CMD} build --no-cache --platform linux/amd64 \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}-docker/api:latest \
  -f packages/backend/Dockerfile .

# Push the image
echo "Pushing image to Artifact Registry..."
${CONTAINER_CMD} push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}-docker/api:latest

echo "✓ Docker image pushed successfully"

# Step 4: Deploy Cloud Run service
echo ""
echo "4️⃣  Deploying Cloud Run service..."
cd terraform
terraform apply -target=google_cloud_run_service.api -auto-approve

# Get Cloud Run URL
API_URL=$(terraform output -raw api_url)
echo ""
echo "✓ Cloud Run service deployed"
echo "  API URL: $API_URL"

# Step 5: Database migrations (run automatically on Cloud Run startup)
echo ""
echo "5️⃣  Database migrations..."
echo "ℹ️  Migrations run automatically when the Cloud Run container starts."
echo "   Check the Cloud Run logs to verify migrations completed successfully."
echo ""
echo "To view migration logs:"
echo "  gcloud logging read \"resource.type=cloud_run_revision AND textPayload=~'migration'\" --limit=20 --project=${PROJECT_ID}"
echo ""

# Step 6: Summary
echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "API URL: $API_URL"
echo "Database: $DB_INSTANCE"
echo ""
echo "Next steps:"
echo "1. Test the API: curl $API_URL/health"
echo "2. Update mobile app API URL to: $API_URL/api"
echo "3. Deploy mobile app to TestFlight"
echo ""
echo "To view logs:"
echo "  gcloud run logs read ${APP_NAME}-api --region=${REGION}"
echo ""
