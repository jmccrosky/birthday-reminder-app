# Fastlane Match Setup Guide

This guide will help you complete the setup for automated iOS code signing using Fastlane Match.

## Prerequisites

- [ ] Apple Developer Account ($99/year)
- [ ] Access to create GitHub repositories
- [ ] Xcode installed
- [ ] Fastlane installed (✅ Already done!)

## Step 1: Create a Private GitHub Repository for Certificates

1. Go to https://github.com/new
2. Repository name: `birthday-reminder-certificates` (or any name you prefer)
3. **IMPORTANT: Set visibility to PRIVATE** 🔒
4. Do NOT initialize with README
5. Click "Create repository"
6. Copy the SSH URL (looks like: `git@github.com:USERNAME/birthday-reminder-certificates.git`)

## Step 2: Update Your Bundle Identifier (IMPORTANT!)

The default React Native bundle ID needs to be changed to your own:

**Current:** `org.reactjs.native.example.BirthdayReminder`
**Change to:** `com.YOURCOMPANY.birthdayreminder` (use your domain in reverse)

### How to change it:

1. Open `packages/mobile/ios/BirthdayReminder.xcworkspace` in Xcode
2. Select the BirthdayReminder project in the left sidebar
3. Select the BirthdayReminder target
4. Go to the "Signing & Capabilities" tab
5. Change the Bundle Identifier to your new identifier
6. Make sure "Automatically manage signing" is UNCHECKED (Match will handle this)

## Step 3: Configure Fastlane Environment Variables

Edit the file: `packages/mobile/fastlane/.env`

Update these values:

```bash
# Your Apple ID email
APPLE_ID=your.email@example.com

# Your Team ID (find at https://developer.apple.com/account, top right)
TEAM_ID=YOUR_TEAM_ID

# Your new bundle identifier (from Step 2)
APP_IDENTIFIER=com.yourcompany.birthdayreminder

# Update this to match your new bundle ID
PROVISIONING_PROFILE_SPECIFIER=match AppStore com.yourcompany.birthdayreminder

# The GitHub repo you created in Step 1
MATCH_GIT_URL=git@github.com:USERNAME/birthday-reminder-certificates.git

# Generate a strong password with: openssl rand -base64 32
# SAVE THIS PASSWORD - you'll need it for CI/CD!
MATCH_PASSWORD=YOUR_STRONG_PASSWORD
```

## Step 4: Generate Match Encryption Password

Run this command to generate a secure password:

```bash
openssl rand -base64 32
```

Copy the output and paste it as your `MATCH_PASSWORD` in the `.env` file.

**IMPORTANT:** Save this password securely! You'll need it anytime you:
- Run Match from a different machine
- Set up CI/CD
- Add a new team member

## Step 5: Register Your App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps"
3. Click the "+" button and select "New App"
4. Fill in:
   - **Platform:** iOS
   - **Name:** Birthday Reminder (or your app name)
   - **Primary Language:** English
   - **Bundle ID:** Select the bundle ID you configured in Step 2
   - **SKU:** Can be anything unique (e.g., `birthday-reminder-001`)
   - **User Access:** Full Access
5. Click "Create"

## Step 6: Initialize Fastlane Match

Run this command from the mobile package directory:

```bash
cd /Users/jmccrosky/git/birthdays/packages/mobile
bundle exec fastlane match appstore
```

This will:
1. Create new certificates and provisioning profiles
2. Upload them to your private GitHub repository (encrypted)
3. Install them on your local machine

**You'll be prompted for:**
- Your git repository password (if using HTTPS) or SSH passphrase
- The Match encryption password you set in Step 4

## Step 7: Test the Build

Try building the app:

```bash
cd /Users/jmccrosky/git/birthdays/packages/mobile
bundle exec fastlane beta
```

This will:
1. Install CocoaPods dependencies
2. Increment the build number
3. Sync code signing (using Match)
4. Build the app
5. Upload to TestFlight

## Troubleshooting

### "No matching provisioning profiles found"

- Make sure you ran `bundle exec fastlane match appstore` first
- Check that your Bundle ID in Xcode matches the one in `.env`

### "Could not find a matching identity"

- Run `bundle exec fastlane match nuke distribution` to delete old certificates
- Then run `bundle exec fastlane match appstore` to create new ones

### Git authentication issues

- Make sure your SSH key is added to GitHub
- Test with: `ssh -T git@github.com`
- If using HTTPS, you may need a personal access token

### Match password forgotten

- If you forget the Match password, you'll need to:
  1. Delete the certificates repo
  2. Create a new one
  3. Run `match appstore` again with a new password
  4. **Revoke old certificates in Apple Developer Portal**

## Files Created

- ✅ `fastlane/.env` - Environment variables (in .gitignore)
- ✅ `fastlane/Fastfile` - Deployment automation
- ✅ `fastlane/Matchfile` - Match configuration
- ✅ `fastlane/Appfile` - App identifiers
- ✅ `fastlane/app-store-connect-api-key.json` - API key (in .gitignore)

## Next Steps After Setup

Once Match is configured, you can deploy to TestFlight with:

```bash
cd /Users/jmccrosky/git/birthdays/packages/mobile
bundle exec fastlane beta
```

## Security Notes

- ✅ `.env` is in .gitignore - never commit it!
- ✅ API key is in .gitignore - never commit it!
- 🔒 Certificates repo must remain PRIVATE
- 🔑 Save your Match password in a password manager
- 🔐 Never share your App Store Connect API key

## Additional Resources

- [Fastlane Match Documentation](https://docs.fastlane.tools/actions/match/)
- [Code Signing Guide](https://codesigning.guide/)
- [Apple Developer Portal](https://developer.apple.com/account)
