# Birthday Reminder App

A full-stack birthday reminder application with an iOS mobile app and cloud-based backend.

## Architecture

- **Frontend**: React Native iOS app
- **Backend**: Node.js/TypeScript with Fastify
- **Database**: PostgreSQL (Google Cloud SQL)
- **Infrastructure**: Google Cloud Platform (GCP)
  - Cloud Run for API hosting
  - Cloud SQL for PostgreSQL database
  - Pub/Sub for push notifications
  - Cloud Scheduler for daily birthday checks
  - Artifact Registry for Docker images
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Deployment**: Fastlane for iOS TestFlight

## Project Structure

```
birthday-reminder-monorepo/
├── packages/
│   ├── backend/          # Node.js/TypeScript API
│   │   ├── src/
│   │   │   ├── routes/   # API routes
│   │   │   ├── services/ # Business logic
│   │   │   ├── db/       # Database schema and migrations
│   │   │   └── middleware/
│   │   └── Dockerfile
│   └── mobile/           # React Native iOS app
│       ├── src/
│       │   ├── screens/  # App screens
│       │   ├── contexts/ # React contexts
│       │   └── services/ # API client
│       ├── ios/          # iOS native code
│       └── fastlane/     # iOS deployment automation
├── terraform/            # Infrastructure as Code
└── .github/workflows/    # CI/CD pipelines
```

## Quick Links

- **[Deployment Guide](./DEPLOYMENT.md)** - Complete guide for deploying backend and iOS app
- **[Mobile Setup](./packages/mobile/SETUP.md)** - iOS development environment setup
- **[Backend README](./packages/backend/README.md)** - Backend API documentation

## Prerequisites

- Node.js >= 20
- pnpm >= 8
- Docker or Podman
- Terraform >= 1.6
- Google Cloud SDK (`gcloud` CLI)
- Ruby >= 3.4 (Homebrew, for Fastlane)
- Xcode >= 15 (for iOS development)
- Apple Developer Account
- Google Cloud Platform account

## Initial Setup

### 1. Install Dependencies

```bash
# Install pnpm globally
npm install -g pnpm

# Install project dependencies
pnpm install

# Install mobile dependencies
cd packages/mobile
bundle install
bundle exec pod install
cd ../..
```

### 2. Google Cloud Setup

#### Create a GCP Project

```bash
# Set your project ID
export GCP_PROJECT_ID="your-project-id"

# Create project
gcloud projects create $GCP_PROJECT_ID

# Set as default project
gcloud config set project $GCP_PROJECT_ID

# Enable billing (required - do this via Console)
# https://console.cloud.google.com/billing
```

#### Create Service Account

```bash
# Create service account for Terraform and deployments
gcloud iam service-accounts create terraform-sa \
  --display-name="Terraform Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:terraform-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/owner"

# Create and download key
gcloud iam service-accounts keys create ~/terraform-key.json \
  --iam-account=terraform-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com
```

#### Create Terraform State Bucket

```bash
# Create bucket for Terraform state
gsutil mb -p $GCP_PROJECT_ID -l us-central1 gs://birthday-reminder-terraform-state

# Enable versioning
gsutil versioning set on gs://birthday-reminder-terraform-state
```

### 3. Configure Terraform

```bash
cd terraform

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
# Set: project_id, database_password, jwt_secret, etc.
nano terraform.tfvars

# Update backend bucket name in main.tf if different
```

### 4. Configure Backend Environment

```bash
cd packages/backend

# Copy example env file
cp .env.example .env

# Edit .env with your values
nano .env
```

## Backend Deployment

**Quick deployment**: Use the automated script from the project root:

```bash
./deploy-backend.sh
```

This script will:
1. Initialize and apply Terraform infrastructure
2. Build Docker image for linux/amd64 (required for Cloud Run)
3. Push to Artifact Registry
4. Deploy to Cloud Run
5. Run database migrations automatically on startup

For detailed deployment instructions and manual steps, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Verify Backend Deployment

```bash
# Test health endpoint
curl https://birthday-reminder-api-3jwpshkfiq-uc.a.run.app/health

# View API documentation
open https://birthday-reminder-api-3jwpshkfiq-uc.a.run.app/documentation
```

## iOS App Setup and Deployment

### 1. Configure Apple Developer Account

#### Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app with your bundle identifier (e.g., `com.yourcompany.birthdayreminder`)
3. Note your Team ID and App ID

#### Generate App Store Connect API Key

1. Go to Users and Access > Keys
2. Generate a new API key with "Admin" or "App Manager" role
3. Download the `.p8` file
4. Save to `packages/mobile/fastlane/app-store-connect-api-key.json`:

```json
{
  "key_id": "YOUR_KEY_ID",
  "issuer_id": "YOUR_ISSUER_ID",
  "key": "-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT\n-----END PRIVATE KEY-----"
}
```

### 2. Configure Fastlane Match (Certificate Management)

#### Create Private Repository for Certificates

```bash
# Create a private GitHub repository named "certificates"
# This will store your certificates and provisioning profiles

# Initialize match
cd packages/mobile
bundle exec fastlane match init

# Generate certificates and profiles
bundle exec fastlane match appstore
```

### 3. Configure Mobile Environment

```bash
cd packages/mobile/fastlane

# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

Required values:
- `APPLE_ID`: Your Apple ID email
- `TEAM_ID`: Your Apple Developer Team ID
- `APP_IDENTIFIER`: Your app bundle ID
- `MATCH_GIT_URL`: URL to your certificates repo
- `MATCH_PASSWORD`: Password to encrypt certificates
- `APP_STORE_CONNECT_API_KEY_PATH`: Path to API key JSON

### 4. Update API URL in Mobile App

```bash
# Edit packages/mobile/src/services/api.ts
# Update API_URL to your Cloud Run URL
nano packages/mobile/src/services/api.ts
```

### 5. Build and Deploy to TestFlight

**Quick deployment**:

```bash
cd packages/mobile
/opt/homebrew/lib/ruby/gems/3.4.0/bin/bundle exec fastlane beta
```

This will:
1. Install CocoaPods dependencies
2. Sync certificates via Match
3. Increment build number automatically
4. Pre-bundle React Native JavaScript (avoids Ruby conflicts)
5. Build and archive the iOS app
6. Upload to TestFlight

**Duration**: ~2-3 minutes

For detailed iOS deployment instructions, troubleshooting, and manual steps, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### 6. Distribute via TestFlight

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app > TestFlight
3. Wait for processing (~5-15 minutes)
4. Add internal/external testers
5. Submit for review (if external testing)

## GitHub Actions CI/CD Setup

### Configure Repository Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

#### Backend Secrets
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SERVICE_ACCOUNT_KEY`: Content of terraform-key.json
- `DATABASE_PASSWORD`: PostgreSQL database password
- `JWT_SECRET`: JWT secret for authentication

#### Mobile Secrets
- `APPLE_ID`: Your Apple ID
- `TEAM_ID`: Your Apple Developer Team ID
- `APP_IDENTIFIER`: Your app bundle identifier
- `MATCH_GIT_URL`: URL to certificates repository
- `MATCH_PASSWORD`: Match encryption password
- `MATCH_GIT_BASIC_AUTHORIZATION`: Base64 encoded `username:personal_access_token`
- `APP_STORE_CONNECT_API_KEY`: Content of app-store-connect-api-key.json

### Automatic Deployments

Once configured, the CI/CD pipelines will:

1. **Backend**: On push to `main` branch with backend changes:
   - Run tests and linting
   - Build Docker image
   - Push to Artifact Registry
   - Deploy to Cloud Run

2. **Mobile**: On push to `main` branch with mobile changes:
   - Run tests and linting
   - Build iOS app
   - Upload to TestFlight

3. **Infrastructure**: On push to `main` branch with terraform changes:
   - Validate configuration
   - Plan changes
   - Apply infrastructure updates

## Local Development

### Backend

```bash
# Start local PostgreSQL (or use Docker)
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# Run migrations
cd packages/backend
pnpm migrate

# Start dev server
pnpm dev

# API will be available at http://localhost:3000
# Docs at http://localhost:3000/documentation
```

### Mobile

```bash
# Start Metro bundler
cd packages/mobile
pnpm start

# In another terminal, run on iOS simulator
pnpm ios

# Or run on physical device (requires proper configuration)
pnpm ios --device "Your Device Name"
```

## Testing

```bash
# Run all tests
pnpm test

# Backend tests only
pnpm --filter backend test

# Mobile tests only
pnpm --filter mobile test
```

## Monitoring and Logs

### Backend Logs

```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=birthday-reminder-api" --limit 50 --format json

# Or use Cloud Console
open https://console.cloud.google.com/run/detail/us-central1/birthday-reminder-api/logs
```

### Database

```bash
# Connect to Cloud SQL
gcloud sql connect birthday-reminder-db --user=birthdayapp

# Or use proxy
cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432
psql -h 127.0.0.1 -U birthdayapp -d birthdays
```

## Troubleshooting

### Backend Issues

**Issue**: Cloud Run service not responding
```bash
# Check service status
gcloud run services describe birthday-reminder-api --region us-central1

# Check recent logs
gcloud logging read "resource.type=cloud_run_revision" --limit 20
```

**Issue**: Database connection errors
```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe birthday-reminder-db

# Check VPC connector
gcloud compute networks vpc-access connectors describe birthday-reminder-connector --region us-central1
```

### Mobile Issues

**Issue**: Build fails in Fastlane
```bash
# Clean build
cd packages/mobile/ios
xcodebuild clean -workspace BirthdayReminder.xcworkspace -scheme BirthdayReminder

# Re-install pods
rm -rf Pods Podfile.lock
bundle exec pod install
```

**Issue**: Certificate/provisioning profile errors
```bash
# Re-sync certificates
cd packages/mobile
bundle exec fastlane match appstore --force

# Or recreate
bundle exec fastlane match nuke distribution
bundle exec fastlane match appstore
```

## Cost Optimization

- **Cloud SQL**: Use `db-f1-micro` for development (already in terraform.tfvars)
- **Cloud Run**: Scales to zero when not in use
- **Cloud Scheduler**: Minimal cost for daily job

Estimated monthly cost for low traffic: $10-30

## Security Best Practices

1. **Never commit secrets**: Use environment variables and `.env` files (gitignored)
2. **Rotate secrets regularly**: JWT secrets, database passwords, API keys
3. **Use service accounts**: Don't use personal credentials in CI/CD
4. **Enable Cloud SQL SSL**: Already configured in Terraform
5. **Restrict API access**: Use Cloud Armor for production if needed

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linting: `pnpm lint`
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
