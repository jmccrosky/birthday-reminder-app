# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Birthday Reminder is a full-stack iOS application with a React Native mobile app and Node.js backend. The backend runs on Google Cloud Platform (Cloud Run + Cloud SQL), and the iOS app is deployed via Fastlane to TestFlight.

**Key Technologies:**
- **Frontend:** React Native 0.82.1 (iOS only), React 19, TypeScript
- **Backend:** Node.js 20+, Fastify, TypeScript, Drizzle ORM
- **Database:** PostgreSQL 15 (Google Cloud SQL)
- **Infrastructure:** Terraform, Google Cloud Platform (Cloud Run, Cloud SQL, Pub/Sub, Cloud Scheduler)
- **Package Management:** pnpm (monorepo with workspace)
- **iOS Deployment:** Fastlane, fastlane-match for certificate management

## Monorepo Structure

This is a pnpm workspace monorepo:
- `packages/backend/` - Fastify API server
- `packages/mobile/` - React Native iOS app
- `terraform/` - GCP infrastructure as code
- `.github/workflows/` - CI/CD pipelines for backend, mobile, and infrastructure

## Common Commands

### Development

```bash
# Backend development server (with hot reload)
pnpm --filter backend dev

# Mobile Metro bundler
pnpm --filter mobile start

# Run iOS app in simulator
pnpm --filter mobile ios

# Install iOS dependencies (CocoaPods)
cd packages/mobile && bundle install && bundle exec pod install
```

### Testing & Linting

```bash
# Run all tests across monorepo
pnpm test

# Backend tests only
pnpm --filter backend test

# Mobile tests only
pnpm --filter mobile test

# Lint all packages
pnpm lint

# Format all code
pnpm format
```

### Database Operations

```bash
# Run database migrations (backend package)
cd packages/backend && pnpm migrate

# Generate new migration from schema changes
cd packages/backend && pnpm db:generate

# Push schema directly to database (development only)
cd packages/backend && pnpm db:push
```

### Backend Deployment

```bash
# Automated deployment script (from project root)
# Runs Terraform, builds Docker image for linux/amd64, pushes to Artifact Registry, deploys to Cloud Run
./deploy-backend.sh

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=birthday-reminder-api" --limit 50 --format json --project=birthday-reminder-475716

# Connect to Cloud SQL database
gcloud sql connect birthday-reminder-db --user=birthdayapp
```

### iOS Deployment

```bash
# Deploy to TestFlight (from packages/mobile directory)
# Takes ~2-3 minutes; includes pod install, certificate sync, build number increment, React Native bundling, build, and upload
/opt/homebrew/lib/ruby/gems/3.4.0/bin/bundle exec fastlane beta

# Sync certificates/provisioning profiles manually
cd packages/mobile && bundle exec fastlane match appstore

# Register new test device
cd packages/mobile && bundle exec fastlane register_device
```

**Important iOS Build Notes:**
- The Fastfile pre-bundles React Native JavaScript to avoid Ruby version conflicts during xcodebuild
- Uses manual code signing via fastlane-match (not automatic signing)
- Handles both main app bundle ID and Share Extension bundle ID (`APP_IDENTIFIER` and `APP_IDENTIFIER.BirthdayImport`)
- Validates IPA contains `main.jsbundle` before uploading
- Requires Ruby 3.4+ installed via Homebrew

## Architecture

### Backend Architecture

**Entry Point:** `packages/backend/src/index.ts`
- Fastify server with automatic database migrations on startup
- JWT authentication via `@fastify/jwt`
- OpenAPI documentation via Swagger at `/documentation`
- Rate limiting configured per-route
- Cron job for daily birthday notifications (production only)

**Database Schema:** `packages/backend/src/db/schema.ts`
- Uses Drizzle ORM with PostgreSQL
- Two main tables: `users` (UUID primary key, email, password hash, device token) and `birthdays` (UUID primary key, foreign key to users, stores month/day/year separately, notification preferences)
- Migrations stored in `drizzle/` directory (auto-generated)

**API Routes:**
- `/api/auth` - Registration, login, logout
- `/api/birthdays` - CRUD operations for birthdays
- `/api/users` - User profile management
- `/health` - Health check endpoint

**Key Services:**
- `notification-cron.ts` - Daily cron job that checks for upcoming birthdays and sends push notifications via Google Cloud Pub/Sub

**Database Connection:**
- Production: Connects to Cloud SQL via Unix socket through VPC Connector
- Local dev: Standard PostgreSQL connection string

### Mobile Architecture

**Entry Point:** `packages/mobile/src/App.tsx`
- React Navigation stack navigator
- AuthContext provides global authentication state
- Axios-based API client in `services/api.ts`

**Screens:**
- `LoginScreen.tsx` / `RegisterScreen.tsx` - Authentication
- `HomeScreen.tsx` - Birthday list view
- `AddBirthdayScreen.tsx` / `EditBirthdayScreen.tsx` - CRUD operations
- `ImportPreviewScreen.tsx` - CSV import preview and confirmation

**iOS Share Extension:**
- Located in `packages/mobile/ios/BirthdayImport/`
- Enables CSV file import via iOS Share Sheet
- Uses App Groups to share data between main app and extension
- Swift implementation in `ShareViewController.swift`

**Push Notifications:**
- Uses `@react-native-community/push-notification-ios`
- Device tokens sent to backend on login/registration
- Backend sends notifications via Google Cloud Pub/Sub

**Data Flow:**
1. User authenticates → JWT stored in AsyncStorage
2. API client attaches JWT to all requests via Authorization header
3. Birthday CRUD operations sync with backend PostgreSQL database
4. Backend cron job checks for upcoming birthdays daily
5. Push notifications sent to device tokens via Pub/Sub

### Infrastructure Architecture

**GCP Resources (Terraform):**
- Cloud Run service for API (scales to zero)
- Cloud SQL PostgreSQL instance (private IP only)
- VPC Connector for Cloud Run to Cloud SQL communication
- Artifact Registry for Docker images
- Pub/Sub topic for push notifications
- Cloud Scheduler job triggering daily birthday checks
- Service accounts with minimal required permissions

**Environment Variables:**
- Backend requires: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `HOST`, `NODE_ENV`
- Mobile Fastlane requires: `APPLE_ID`, `TEAM_ID`, `APP_IDENTIFIER`, `MATCH_GIT_URL`, `MATCH_PASSWORD`, `APP_STORE_CONNECT_API_KEY_PATH`

## Development Workflow

1. **Backend changes:**
   - Edit code in `packages/backend/src/`
   - Database schema changes: edit `schema.ts`, run `pnpm db:generate`, commit migration
   - Test locally with `pnpm dev`
   - Deploy via `./deploy-backend.sh`

2. **Mobile changes:**
   - Edit code in `packages/mobile/src/`
   - Test in simulator via `pnpm ios`
   - For iOS-specific changes, edit Swift/Objective-C in `packages/mobile/ios/`
   - Deploy to TestFlight via `bundle exec fastlane beta`

3. **Infrastructure changes:**
   - Edit Terraform files in `terraform/`
   - Test with `terraform plan`
   - Apply via `./deploy-backend.sh` or `terraform apply`

## iOS-Specific Notes

### Xcode 16 Compatibility
- CocoaPods has compatibility issues with Xcode 16
- Run `pod install` manually before Fastlane (Fastfile skips cocoapods action)
- Use Homebrew Ruby 3.4+, not system Ruby

### App Groups & Share Extension
- App Group ID: matches developer account (not hardcoded here)
- BirthdayImport Share Extension shares data with main app via App Groups
- CSV files parsed in Swift, passed to React Native via shared storage

### Certificate Management
- Uses fastlane-match with private GitHub repository
- Stores distribution certificates and App Store provisioning profiles
- Handles both main app and extension bundle IDs
- Match password required in environment variables

## CI/CD Pipelines

**`.github/workflows/backend.yml`:**
- Triggers on push to main with backend changes
- Runs tests, builds Docker image, deploys to Cloud Run

**`.github/workflows/mobile.yml`:**
- Triggers on push to main with mobile changes
- Runs tests, builds iOS app, uploads to TestFlight

**`.github/workflows/terraform.yml`:**
- Triggers on push to main with terraform changes
- Validates, plans, and applies infrastructure changes

## Security Practices

- Snyk security scanning enabled via `.cursor/rules/snyk_rules.mdc`
- All secrets in `.env` files (gitignored)
- Service accounts with least-privilege IAM roles
- JWT-based authentication with bcrypt password hashing
- Cloud SQL uses private IP with SSL enforced
- Rate limiting on all API routes

## Important Files

- `deploy-backend.sh` - Automated backend deployment script
- `packages/backend/src/db/schema.ts` - Database schema (source of truth)
- `packages/mobile/fastlane/Fastfile` - iOS build and deployment automation
- `terraform/main.tf` - Infrastructure definition
- `.github/workflows/` - CI/CD pipeline definitions
- `packages/mobile/src/services/api.ts` - API client configuration (update API_URL after backend deployment)
