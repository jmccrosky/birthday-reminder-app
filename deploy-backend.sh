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

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "❌ Error: Not authenticated with gcloud"
  echo "Please run: gcloud auth login"
  exit 1
fi

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
echo "This will create:"
echo "  - VPC and networking"
echo "  - Cloud SQL PostgreSQL instance"
echo "  - Artifact Registry"
echo "  - Service accounts and IAM roles"
echo "  - VPC Connector"
echo "  - Pub/Sub topic"
echo "  - Cloud Scheduler job"
echo ""
read -p "Continue with Terraform apply? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled"
  exit 1
fi

terraform plan
terraform apply

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

# Build the image
echo "Building Docker image..."
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}-docker/api:latest \
  -f packages/backend/Dockerfile .

# Push the image
echo "Pushing image to Artifact Registry..."
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${APP_NAME}-docker/api:latest

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

# Step 5: Run database migrations
echo ""
echo "5️⃣  Running database migrations..."
echo "Connecting to Cloud SQL to run migrations..."

# Get database password from terraform.tfvars
DB_PASSWORD=$(grep database_password terraform.tfvars | cut -d'"' -f2)
DB_NAME=$(grep database_name terraform.tfvars | cut -d'"' -f2)
DB_USER=$(grep database_user terraform.tfvars | cut -d'"' -f2)

# Run migrations via Cloud SQL Proxy in a temporary container
echo "Starting Cloud SQL Proxy..."
docker run -d --name cloudsql-proxy \
  -v /Users/jmccrosky/git/birthdays/gcp-service-account.json:/config \
  gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest \
  --credentials-file=/config \
  $DB_INSTANCE

# Wait for proxy to start
sleep 5

# Run migrations
cd ../packages/backend
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@host.docker.internal:5432/${DB_NAME}" \
  npm run migrate

# Stop and remove proxy
docker stop cloudsql-proxy
docker rm cloudsql-proxy

echo "✓ Database migrations completed"

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
