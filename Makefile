.PHONY: help install dev test lint clean deploy-backend deploy-mobile deploy-infra

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	pnpm install
	cd packages/mobile && bundle install && bundle exec pod install

dev-backend: ## Start backend development server
	pnpm backend:dev

dev-mobile: ## Start mobile development (Metro bundler)
	pnpm mobile:start

ios: ## Run iOS app in simulator
	pnpm mobile:ios

test: ## Run all tests
	pnpm test

lint: ## Run linting
	pnpm lint

format: ## Format code with Prettier
	pnpm format

clean: ## Clean build artifacts
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/backend/dist
	rm -rf packages/mobile/ios/build
	rm -rf packages/mobile/ios/Pods
	rm -rf packages/mobile/ios/Podfile.lock

# Terraform commands
tf-init: ## Initialize Terraform
	cd terraform && terraform init

tf-plan: ## Run Terraform plan
	cd terraform && terraform plan

tf-apply: ## Apply Terraform changes
	cd terraform && terraform apply

tf-destroy: ## Destroy Terraform infrastructure
	cd terraform && terraform destroy

# Deployment commands
deploy-backend: ## Deploy backend to Cloud Run
	@echo "Building and pushing Docker image..."
	docker build -t $(DOCKER_IMAGE):latest -f packages/backend/Dockerfile .
	docker push $(DOCKER_IMAGE):latest
	@echo "Deploying to Cloud Run..."
	gcloud run deploy birthday-reminder-api \
		--image $(DOCKER_IMAGE):latest \
		--region $(GCP_REGION) \
		--platform managed

deploy-mobile: ## Deploy mobile app to TestFlight
	cd packages/mobile && pnpm deploy:testflight

deploy-infra: ## Deploy infrastructure with Terraform
	cd terraform && terraform apply -auto-approve

# Database commands
db-migrate: ## Run database migrations
	cd packages/backend && pnpm migrate

db-console: ## Connect to Cloud SQL database
	gcloud sql connect birthday-reminder-db --user=birthdayapp

# Utility commands
logs-backend: ## View backend logs
	gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=birthday-reminder-api" \
		--limit 50 --format json

health-check: ## Check backend health
	@curl -f $(API_URL)/health && echo "\n✅ Backend is healthy" || echo "\n❌ Backend is not responding"

setup-gcp: ## Initial GCP project setup
	@echo "Setting up GCP project..."
	gcloud projects create $(GCP_PROJECT_ID) || echo "Project already exists"
	gcloud config set project $(GCP_PROJECT_ID)
	@echo "Creating service account..."
	gcloud iam service-accounts create terraform-sa --display-name="Terraform Service Account" || echo "Service account exists"
	gcloud projects add-iam-policy-binding $(GCP_PROJECT_ID) \
		--member="serviceAccount:terraform-sa@$(GCP_PROJECT_ID).iam.gserviceaccount.com" \
		--role="roles/owner"
	@echo "Creating state bucket..."
	gsutil mb -p $(GCP_PROJECT_ID) gs://birthday-reminder-terraform-state || echo "Bucket exists"
	gsutil versioning set on gs://birthday-reminder-terraform-state
	@echo "✅ GCP setup complete"

# Environment variables (customize these)
GCP_PROJECT_ID ?= $(shell gcloud config get-value project)
GCP_REGION ?= us-central1
DOCKER_IMAGE ?= $(GCP_REGION)-docker.pkg.dev/$(GCP_PROJECT_ID)/birthday-reminder-docker/api
API_URL ?= $(shell cd terraform && terraform output -raw api_url 2>/dev/null || echo "http://localhost:3000")
