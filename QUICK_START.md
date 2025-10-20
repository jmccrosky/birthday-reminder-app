# Quick Start Guide

This guide will help you deploy the Birthday Reminder app to TestFlight and get the backend running on Google Cloud in under 30 minutes.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Google Cloud Platform account with billing enabled
- [ ] Apple Developer Program membership
- [ ] GitHub account
- [ ] Node.js 20+, pnpm 8+, Docker, Terraform, Xcode, Ruby 3.2+

## Step 1: Clone and Install (5 minutes)

```bash
# Clone the repository
cd /Users/jmccrosky/git/birthdays

# Install dependencies
pnpm install

# Install mobile Ruby dependencies
cd packages/mobile
bundle install
```

## Step 2: Google Cloud Setup (10 minutes)

```bash
# Set your project ID
export GCP_PROJECT_ID="your-unique-project-id"

# Create project
gcloud projects create $GCP_PROJECT_ID

# Set as default
gcloud config set project $GCP_PROJECT_ID

# Enable billing (do this in Console)
open "https://console.cloud.google.com/billing/linkedaccount?project=$GCP_PROJECT_ID"

# Create service account
gcloud iam service-accounts create terraform-sa \
  --display-name="Terraform Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:terraform-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/owner"

# Create key
gcloud iam service-accounts keys create ~/terraform-key.json \
  --iam-account=terraform-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Create Terraform state bucket
gsutil mb -p $GCP_PROJECT_ID gs://birthday-reminder-terraform-state
gsutil versioning set on gs://birthday-reminder-terraform-state

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS=~/terraform-key.json
```

## Step 3: Deploy Backend (5 minutes)

```bash
cd terraform

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
project_id        = "$GCP_PROJECT_ID"
region            = "us-central1"
database_password = "$(openssl rand -base64 32)"
jwt_secret        = "$(openssl rand -base64 32)"
EOF

# Deploy infrastructure
terraform init
terraform apply -auto-approve

# Save the API URL
export API_URL=$(terraform output -raw api_url)
echo "API URL: $API_URL"

# Build and deploy API
cd ..
docker build -t us-central1-docker.pkg.dev/$GCP_PROJECT_ID/birthday-reminder-docker/api:latest \
  -f packages/backend/Dockerfile .

gcloud auth configure-docker us-central1-docker.pkg.dev

docker push us-central1-docker.pkg.dev/$GCP_PROJECT_ID/birthday-reminder-docker/api:latest

# Verify deployment
curl $API_URL/health
```

## Step 4: Configure iOS App (5 minutes)

### Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Choose iOS, enter app name, select language
4. Choose a unique Bundle ID (e.g., `com.yourname.birthdayreminder`)
5. Click "Create"

### Generate App Store Connect API Key

1. Go to Users and Access → Keys
2. Click "+" to generate new key
3. Name it "Fastlane" and select "Admin" access
4. Download the .p8 file
5. Note the Key ID and Issuer ID

### Create Match Repository

```bash
# Create a PRIVATE GitHub repository named "certificates"
# Then run:

cd packages/mobile

# Create Fastlane env file
cat > fastlane/.env <<EOF
APPLE_ID=your.email@apple.com
TEAM_ID=YOUR_TEAM_ID
APP_IDENTIFIER=com.yourname.birthdayreminder
MATCH_GIT_URL=git@github.com:yourusername/certificates.git
MATCH_PASSWORD=$(openssl rand -base64 32)
APP_STORE_CONNECT_API_KEY_PATH=./fastlane/app-store-connect-api-key.json
EOF

# Create API key JSON
cat > fastlane/app-store-connect-api-key.json <<EOF
{
  "key_id": "YOUR_KEY_ID",
  "issuer_id": "YOUR_ISSUER_ID",
  "key": "-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT\n-----END PRIVATE KEY-----"
}
EOF
```

### Update API URL

```bash
# Edit src/services/api.ts
# Change the API_URL to your Cloud Run URL
sed -i '' "s|http://localhost:3000/api|$API_URL/api|" src/services/api.ts
```

## Step 5: Deploy to TestFlight (5 minutes)

```bash
cd packages/mobile

# Initialize match (first time only)
bundle exec fastlane match appstore

# Build and deploy to TestFlight
pnpm deploy:testflight

# Or use fastlane directly
bundle exec fastlane ios beta
```

## Step 6: Set Up CI/CD (2 minutes)

Add these secrets to your GitHub repository:

### Backend Secrets
```bash
# In GitHub: Settings → Secrets and variables → Actions → New repository secret

GCP_PROJECT_ID: your-gcp-project-id
GCP_SERVICE_ACCOUNT_KEY: <paste contents of ~/terraform-key.json>
DATABASE_PASSWORD: <from terraform.tfvars>
JWT_SECRET: <from terraform.tfvars>
```

### Mobile Secrets
```bash
APPLE_ID: your.email@apple.com
TEAM_ID: YOUR_TEAM_ID
APP_IDENTIFIER: com.yourname.birthdayreminder
MATCH_GIT_URL: git@github.com:yourusername/certificates.git
MATCH_PASSWORD: <from fastlane/.env>
MATCH_GIT_BASIC_AUTHORIZATION: <base64 of username:token>
APP_STORE_CONNECT_API_KEY: <paste contents of app-store-connect-api-key.json>
```

## Verification

### Backend

```bash
# Test health
curl $API_URL/health

# Test registration
curl -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# View docs
open "$API_URL/documentation"
```

### Mobile

1. Open [App Store Connect](https://appstoreconnect.apple.com)
2. Go to your app → TestFlight
3. Wait for processing (10-30 minutes)
4. Add yourself as internal tester
5. Download TestFlight app on your iPhone
6. Install and test your app

## Troubleshooting

### Backend Issues

**Error: "Permission denied"**
```bash
# Ensure service account has correct permissions
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:terraform-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/owner"
```

**Error: "API not enabled"**
```bash
# Enable required APIs manually
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Mobile Issues

**Error: "No profiles for team"**
```bash
# Re-run match
bundle exec fastlane match appstore --force
```

**Error: "Code signing failed"**
```bash
# Clean and retry
cd ios
rm -rf Pods Podfile.lock DerivedData
bundle exec pod install
cd ..
bundle exec fastlane ios beta
```

## Next Steps

1. **Test the app**: Install from TestFlight and create test birthdays
2. **Invite testers**: Add external testers in App Store Connect
3. **Monitor**: Check Cloud Run logs for any errors
4. **Optimize**: Review costs and performance
5. **Launch**: Submit to App Store when ready

## Costs

Expected monthly costs for low traffic:
- Cloud Run: $5-10
- Cloud SQL: $10-15
- Other services: $5

**Total**: ~$20-30/month

## Support

- Full documentation: See [README.md](README.md)
- Architecture: See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Deployment checklist: See [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)

## Success! 🎉

You now have:
- ✅ Backend API running on Google Cloud
- ✅ Database set up and migrated
- ✅ iOS app deployed to TestFlight
- ✅ CI/CD pipeline configured
- ✅ Infrastructure as code

Time to celebrate birthdays! 🎂
