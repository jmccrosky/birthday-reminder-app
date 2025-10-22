# Deployment Guide

This guide covers deploying the Birthday Reminder app to production environments.

## Table of Contents

- [Backend Deployment](#backend-deployment)
- [iOS App Deployment to TestFlight](#ios-app-deployment-to-testflight)
- [Troubleshooting](#troubleshooting)

## Backend Deployment

### Prerequisites

- Docker or Podman installed
- Google Cloud SDK (`gcloud`) installed and authenticated
- GCP project configured with Cloud Run, Cloud SQL, etc.

**Important**: The Docker image must be built for `linux/amd64` architecture (required by Cloud Run). The deployment script automatically handles this.

### Deploy to Google Cloud Run

```bash
# From the project root
./deploy-backend.sh
```

This script will:
1. Build the Docker image for the backend (linux/amd64 platform)
2. Push it to Google Artifact Registry
3. Deploy to Cloud Run
4. Run database migrations automatically on startup
5. Apply Terraform configuration for infrastructure

**Key Features:**
- Database migrations run automatically when the container starts
- Rate limiting: 20 registration attempts per day per IP
- Supports both Docker and Podman

### Manual Backend Deployment

If you need to deploy manually:

```bash
# Build the Docker image for AMD64 (required for Cloud Run)
podman build --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/birthday-reminder-475716/birthday-reminder-docker/api:latest \
  -f packages/backend/Dockerfile .

# Push to Artifact Registry
podman push us-central1-docker.pkg.dev/birthday-reminder-475716/birthday-reminder-docker/api:latest

# Deploy to Cloud Run
gcloud run deploy birthday-reminder-api \
  --image us-central1-docker.pkg.dev/birthday-reminder-475716/birthday-reminder-docker/api:latest \
  --region us-central1 \
  --platform managed
```

**Note**: The `--platform linux/amd64` flag is critical. Without it, if you're on an ARM-based Mac (M1/M2/M3), the image will be built for ARM64 and will fail to start on Cloud Run with "exec format error".

## iOS App Deployment to TestFlight

### Prerequisites

1. **Ruby 3.0+** (required for CocoaPods and Fastlane)
   ```bash
   # Install Homebrew Ruby
   brew install ruby

   # Add to your ~/.zshrc or ~/.bash_profile:
   export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
   export PATH="/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"
   ```

2. **Fastlane and dependencies**
   ```bash
   cd packages/mobile
   bundle install
   ```

3. **Apple Developer Account** with:
   - App Store Connect API key configured
   - Certificates and provisioning profiles set up via Match
   - TestFlight access

4. **Environment Variables**
   - Create `packages/mobile/fastlane/.env` with:
     ```
     TEAM_ID=your_team_id
     APP_IDENTIFIER=your_bundle_id
     APP_STORE_CONNECT_API_KEY_PATH=./fastlane/app-store-connect-api-key.json
     MATCH_PASSWORD=your_match_password
     ```

### Deploy to TestFlight

**Important:** The deployment process has been optimized to avoid Ruby/bundler version conflicts by pre-bundling the React Native JavaScript before running xcodebuild.

#### One-Command Deployment

```bash
cd packages/mobile
/opt/homebrew/lib/ruby/gems/3.4.0/bin/bundle exec fastlane beta
```

This will:
1. Install CocoaPods dependencies
2. Increment the build number
3. Sync code signing certificates (via Match)
4. **Bundle React Native JavaScript** (pre-build step to avoid conflicts)
5. Build and archive the iOS app
6. Export the IPA
7. Upload to TestFlight

The entire process takes about 2-3 minutes.

### How the Build Process Works

The Fastfile has been configured to handle React Native bundling separately from xcodebuild to avoid Ruby version conflicts:

1. **Pre-bundling JavaScript**: Before building, Fastlane runs:
   ```bash
   pnpm react-native bundle --platform ios --dev false \
     --entry-file index.js \
     --bundle-output ios/main.jsbundle \
     --assets-dest ios
   ```

2. **Skipping Xcode bundling**: The xcodebuild step passes `SKIP_BUNDLING=1` to prevent the Xcode build script from trying to bundle again.

3. **Production Bundle Loading**: `AppDelegate.swift` uses conditional compilation:
   - `DEBUG` builds: Load from Metro bundler (http://localhost:8081)
   - `RELEASE` builds: Load from the pre-bundled `main.jsbundle` file

### Viewing TestFlight Build Status

After upload completes:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to TestFlight tab
4. Wait for processing (usually 5-15 minutes)
5. Add testers and distribute the build

## Export Compliance / Encryption Declaration

The app now includes `ITSAppUsesNonExemptEncryption = NO` in `Info.plist` (at `packages/mobile/ios/BirthdayReminder/Info.plist:62`), which tells Apple that the app only uses standard encryption (HTTPS, etc.) and doesn't require export compliance documentation.

**This means you won't be asked the cryptography question when uploading to TestFlight.**

If your app changes to use custom encryption in the future, you'll need to update this setting.

## Troubleshooting

### iOS Build Issues

#### Ruby Version Conflicts

**Symptom**: Errors like "Could not find 'bundler' (2.7.2)" or Ruby 2.6 vs 3.4 conflicts

**Solution**: The build process has been updated to avoid these conflicts by pre-bundling JavaScript. If you still see issues:

1. Ensure you're using Homebrew Ruby:
   ```bash
   which ruby  # Should show /opt/homebrew/opt/ruby/bin/ruby
   ruby --version  # Should show 3.4.x
   ```

2. Check that `.xcode.env.local` is configured:
   ```bash
   cat ios/.xcode.env.local
   # Should contain:
   # export NODE_BINARY=/opt/homebrew/bin/node
   # export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"
   ```

3. Reinstall dependencies:
   ```bash
   cd packages/mobile
   bundle install
   cd ios && pod install
   ```

#### App Shows "Hello World" on Launch

**Symptom**: TestFlight build shows "Hello World" instead of the actual app UI

**Cause**: JavaScript bundle was not being packaged into the IPA during the Xcode build

**Root Cause**: When we set `SKIP_BUNDLING=1` to avoid Ruby conflicts, the Xcode build script would exit early and never copy the pre-generated JavaScript bundle into the app bundle. The IPA was being created without the JavaScript code.

**Solution**: Fixed in two places:

1. **AppDelegate.swift** - Correct conditional compilation for bundle loading:
```swift
override func sourceURL(for bridge: RCTBridge!) -> URL! {
  #if DEBUG
    // In development, use Metro bundler
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
  #else
    // In production, use the bundled JS file
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  #endif
}
```

2. **Xcode Build Script** (in `project.pbxproj`) - Modified to copy pre-generated bundle:
   - When `SKIP_BUNDLING=1` is set, the script now **copies** the pre-generated `main.jsbundle` into the app bundle
   - Before: Script would exit early, leaving no JavaScript in the IPA
   - After: Script copies `ios/main.jsbundle` to `$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle`

The build log now shows:
```
Using pre-generated React Native bundle
Copying /path/to/ios/main.jsbundle to /path/to/BirthdayReminder.app/
✅ Pre-generated bundle copied successfully
```

#### Build Succeeds but IPA Not Found

**Symptom**: Archive succeeds but no IPA file is created

**Solution**: Check the Fastlane output directory:
```bash
ls -la ~/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/
```

The IPA should be in `packages/mobile/build/` after export completes.

#### CocoaPods Installation Fails

**Symptom**: `pod install` fails with dependency errors

**Solution**:
```bash
cd packages/mobile/ios
pod deintegrate
pod install
```

### Backend Deployment Issues

#### "Internal Server Error" on Account Registration

**Symptom**: Mobile app shows "Internal Server Error" when trying to create an account

**Cause**: Database tables don't exist (migrations haven't been run)

**Solution**: The backend now automatically runs migrations on startup. If you deployed before this fix:

1. Check logs to confirm migrations ran:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=birthday-reminder-api AND textPayload=~\"migration\"" --limit=10 --project=birthday-reminder-475716
```

2. You should see:
```
Running database migrations...
Database migrations completed!
```

3. If migrations didn't run, redeploy the latest backend version which includes automatic migrations in `src/index.ts:22-32`

#### Docker Build Fails with "exec format error"

**Symptom**: Container fails to start on Cloud Run with "Application failed to start: failed to load /usr/local/bin/docker-entrypoint.sh: exec format error"

**Cause**: Docker image was built for wrong architecture (ARM64 instead of AMD64)

**Solution**: Always build with `--platform linux/amd64` flag:
```bash
podman build --platform linux/amd64 -t <image-name> .
```

The `deploy-backend.sh` script now automatically includes this flag.

#### Cloud SQL Connection Fails

**Symptom**: Backend can't connect to Cloud SQL database

**Solution**:
1. Ensure Cloud SQL instance is running
2. Check that Cloud SQL Proxy is configured correctly
3. Verify database credentials in `.env.production`
4. Check Cloud Run service has proper IAM permissions
5. Ensure DATABASE_URL password is URL-encoded (special characters like `/` should be `%2F`)

#### Docker Build Fails

**Symptom**: Container build fails with permission or dependency errors

**Solution**:
1. Clean Docker cache: `podman system prune -a`
2. Ensure .dockerignore is properly configured
3. Check that all dependencies are listed in `package.json`

## Rollback Procedures

### Rolling Back iOS App

If a TestFlight build has critical issues:
1. Go to App Store Connect > TestFlight
2. Stop testing for the problematic build
3. Re-enable the previous stable build
4. Notify testers

### Rolling Back Backend

```bash
# List recent revisions
gcloud run revisions list --service=birthday-reminder-api --region=us-central1

# Route traffic to a specific revision
gcloud run services update-traffic birthday-reminder-api \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1
```

## CI/CD Integration

### GitHub Actions (Future)

Create `.github/workflows/deploy-ios.yml`:
```yaml
name: Deploy iOS to TestFlight

on:
  push:
    branches: [main]
    paths:
      - 'packages/mobile/**'

jobs:
  deploy:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: |
          cd packages/mobile
          bundle install
      - name: Deploy to TestFlight
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
        run: |
          cd packages/mobile
          bundle exec fastlane beta
```

## Monitoring

- **Backend logs**: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=birthday-reminder-api" --limit=50`
- **TestFlight crash reports**: App Store Connect > TestFlight > Build > Crashes
- **App Analytics**: App Store Connect > Analytics

## Support

For deployment issues:
1. Check this troubleshooting guide
2. Review recent commits for changes to deployment scripts
3. Check Cloud Run logs for backend issues
4. Review TestFlight crash reports for iOS issues
