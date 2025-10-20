# Deployment Checklist

Use this checklist when deploying the Birthday Reminder app for the first time.

## Prerequisites

### Accounts & Access
- [ ] Google Cloud Platform account created
- [ ] GCP billing enabled
- [ ] Apple Developer Program membership ($99/year)
- [ ] GitHub repository created
- [ ] Domain name registered (optional, for custom API domain)

### Local Development Tools
- [ ] Node.js 20+ installed
- [ ] pnpm 8+ installed
- [ ] Docker installed and running
- [ ] Google Cloud SDK (`gcloud`) installed
- [ ] Terraform 1.6+ installed
- [ ] Xcode installed (latest stable version)
- [ ] Ruby 3.2+ installed
- [ ] Git configured

## Google Cloud Setup

### Project Setup
- [ ] GCP project created
- [ ] Project ID noted and saved
- [ ] Billing account linked to project
- [ ] `gcloud` authenticated (`gcloud auth login`)
- [ ] Default project set (`gcloud config set project PROJECT_ID`)

### Service Account
- [ ] Terraform service account created
- [ ] Owner role assigned to service account
- [ ] Service account key downloaded as JSON
- [ ] Key file saved securely (e.g., `~/terraform-key.json`)
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` environment variable set

### Terraform State Storage
- [ ] GCS bucket created for Terraform state
- [ ] Bucket name: `birthday-reminder-terraform-state`
- [ ] Versioning enabled on bucket
- [ ] Bucket location matches your region preference

## Apple Developer Setup

### App Store Connect
- [ ] App created in App Store Connect
- [ ] Bundle identifier chosen (e.g., `com.yourcompany.birthdayreminder`)
- [ ] App name reserved
- [ ] Team ID noted

### API Keys
- [ ] App Store Connect API key created
- [ ] Key ID, Issuer ID, and .p8 file downloaded
- [ ] API key JSON file created for Fastlane

### Certificates
- [ ] Private GitHub repository created for certificates
- [ ] Fastlane Match initialized
- [ ] Distribution certificates generated
- [ ] App Store provisioning profiles created

## Backend Deployment

### Configuration
- [ ] `terraform/terraform.tfvars` created from example
- [ ] All required variables filled in:
  - [ ] `project_id`
  - [ ] `database_password` (strong, unique)
  - [ ] `jwt_secret` (strong, random)
  - [ ] `region` (e.g., `us-central1`)
- [ ] Backend bucket name updated in `terraform/main.tf`

### Terraform Deployment
- [ ] `terraform init` successful
- [ ] `terraform plan` reviewed
- [ ] `terraform apply` completed
- [ ] Outputs saved (`terraform output -json > outputs.json`)
- [ ] API URL noted from outputs

### Database Setup
- [ ] Cloud SQL Proxy installed
- [ ] Database connection tested
- [ ] Migrations run successfully
- [ ] Test data created (optional)

### Docker & Cloud Run
- [ ] Docker authenticated to Artifact Registry
- [ ] Backend Docker image built
- [ ] Image pushed to Artifact Registry
- [ ] Cloud Run service deployed
- [ ] Health check endpoint tested (`/health`)
- [ ] API documentation accessible (`/documentation`)

## Mobile Deployment

### Configuration Files
- [ ] `packages/mobile/fastlane/.env` created from example
- [ ] All Fastlane environment variables set:
  - [ ] `APPLE_ID`
  - [ ] `TEAM_ID`
  - [ ] `APP_IDENTIFIER`
  - [ ] `MATCH_GIT_URL`
  - [ ] `MATCH_PASSWORD`
  - [ ] `APP_STORE_CONNECT_API_KEY_PATH`

### App Configuration
- [ ] API URL updated in `packages/mobile/src/services/api.ts`
- [ ] Bundle identifier updated in Xcode project
- [ ] App icons added to project
- [ ] Launch screen configured
- [ ] App permissions configured in Info.plist:
  - [ ] Push notifications
  - [ ] Background modes (if needed)

### Build & Deploy
- [ ] Ruby dependencies installed (`bundle install`)
- [ ] CocoaPods installed (`bundle exec pod install`)
- [ ] Fastlane Match synced (`bundle exec fastlane sync_certificates`)
- [ ] Test build successful in Xcode
- [ ] Fastlane beta lane runs successfully
- [ ] App uploaded to TestFlight
- [ ] App processed successfully in App Store Connect

## GitHub Actions Setup

### Repository Secrets - Backend
- [ ] `GCP_PROJECT_ID` added
- [ ] `GCP_SERVICE_ACCOUNT_KEY` added (JSON content)
- [ ] `DATABASE_PASSWORD` added
- [ ] `JWT_SECRET` added

### Repository Secrets - Mobile
- [ ] `APPLE_ID` added
- [ ] `TEAM_ID` added
- [ ] `APP_IDENTIFIER` added
- [ ] `MATCH_GIT_URL` added
- [ ] `MATCH_PASSWORD` added
- [ ] `MATCH_GIT_BASIC_AUTHORIZATION` added
- [ ] `APP_STORE_CONNECT_API_KEY` added (JSON content)

### Workflow Verification
- [ ] Backend workflow runs successfully
- [ ] Mobile workflow runs successfully
- [ ] Terraform workflow runs successfully
- [ ] No workflow errors in Actions tab

## Testing & Verification

### Backend Testing
- [ ] Health endpoint returns 200 OK
- [ ] User registration works
- [ ] User login returns JWT token
- [ ] Birthday CRUD operations work
- [ ] Authentication middleware works
- [ ] Database queries are performant
- [ ] Logs visible in Cloud Console

### Mobile Testing
- [ ] App launches successfully
- [ ] Registration flow works
- [ ] Login flow works
- [ ] Birthday list displays correctly
- [ ] Add birthday works
- [ ] Edit birthday works
- [ ] Delete birthday works
- [ ] Logout works
- [ ] Push notification permissions requested
- [ ] Device token registered with backend

### Integration Testing
- [ ] Mobile app connects to backend API
- [ ] Data syncs correctly
- [ ] Push notifications received on device
- [ ] Daily notification cron job runs
- [ ] Cloud Scheduler triggers successfully

## Security Checklist

### Secrets Management
- [ ] No secrets committed to repository
- [ ] `.env` files in `.gitignore`
- [ ] Service account keys stored securely
- [ ] API keys rotated after initial setup
- [ ] Strong passwords used for all services

### Access Control
- [ ] GCP IAM permissions reviewed
- [ ] Service accounts use least privilege
- [ ] GitHub repository access restricted
- [ ] Certificate repository access restricted
- [ ] Production database not publicly accessible

### Network Security
- [ ] Cloud SQL requires SSL
- [ ] Cloud Run uses HTTPS only
- [ ] API uses HTTPS in production
- [ ] VPC configured correctly

## Monitoring & Alerts

### Setup Monitoring
- [ ] Cloud Logging configured
- [ ] Cloud Monitoring dashboard created
- [ ] Error tracking enabled
- [ ] Uptime checks configured
- [ ] Budget alerts set up

### Alert Policies
- [ ] High error rate alert
- [ ] Database connection alert
- [ ] API latency alert
- [ ] Storage limit alert
- [ ] Cost threshold alert

## Documentation

### Internal Documentation
- [ ] README.md reviewed and updated
- [ ] ARCHITECTURE.md reviewed
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Troubleshooting guide created

### External Documentation
- [ ] App Store description written
- [ ] Privacy policy created and published
- [ ] Terms of service created and published
- [ ] User guide written (optional)

## Post-Deployment

### Immediate Tasks
- [ ] TestFlight internal testing completed
- [ ] External testers invited
- [ ] Feedback collected and addressed
- [ ] Performance metrics reviewed
- [ ] Error logs reviewed

### Within First Week
- [ ] Monitor API performance
- [ ] Monitor database performance
- [ ] Review GCP costs
- [ ] Address any user feedback
- [ ] Fix any critical bugs

### Within First Month
- [ ] App Store submission prepared
- [ ] Marketing materials created
- [ ] Analytics configured
- [ ] User onboarding optimized
- [ ] Performance optimizations applied

## Production Readiness

Before going to production (App Store):

- [ ] All tests passing
- [ ] No known critical bugs
- [ ] Performance acceptable
- [ ] Security audit completed
- [ ] Privacy policy and terms of service finalized
- [ ] App Store screenshots and description ready
- [ ] Support email/website ready
- [ ] Backup and recovery tested
- [ ] Monitoring and alerts configured
- [ ] Team trained on support procedures

## Rollback Plan

In case of issues:

- [ ] Previous Docker image SHA noted
- [ ] Rollback procedure documented
- [ ] Database backup verified
- [ ] Emergency contacts listed
- [ ] Communication plan for users

## Sign-off

- [ ] Technical lead approval
- [ ] Product owner approval
- [ ] Security review completed
- [ ] Legal review completed (privacy policy, etc.)
- [ ] Budget approved
- [ ] Launch date scheduled

---

## Notes

Document any issues, special configurations, or deviations from standard setup:

```
[Add your deployment notes here]
```

## Contact

Deployment completed by: _______________
Date: _______________
Email: _______________
