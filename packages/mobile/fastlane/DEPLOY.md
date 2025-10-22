# Quick TestFlight Deployment Reference

## One-Command Deploy

```bash
cd packages/mobile
/opt/homebrew/lib/ruby/gems/3.4.0/bin/bundle exec fastlane beta
```

## What It Does

1. Installs CocoaPods dependencies
2. Increments build number automatically
3. Syncs code signing certificates via Match
4. Bundles React Native JavaScript (pre-build, avoids Ruby conflicts)
5. Builds and archives the iOS app
6. Exports IPA file
7. Uploads to TestFlight

**Duration**: ~2-3 minutes

## Prerequisites Checklist

- [ ] Homebrew Ruby 3.4+ installed
- [ ] `fastlane/.env` configured with:
  - `TEAM_ID`
  - `APP_IDENTIFIER`
  - `APP_STORE_CONNECT_API_KEY_PATH`
  - `MATCH_PASSWORD`
- [ ] App Store Connect API key at `fastlane/app-store-connect-api-key.json`
- [ ] Match certificates repository accessible

## Troubleshooting

### "Could not find bundler"
Ensure you're using Homebrew Ruby:
```bash
which ruby  # Should show /opt/homebrew/opt/ruby/bin/ruby
```

### Build fails with Ruby version error
Check `.xcode.env.local`:
```bash
cat ios/.xcode.env.local
# Should export PATH with Homebrew Ruby
```

### App shows "Hello World" on device
This has been fixed. The app now correctly loads the bundled JavaScript in production builds via the pre-bundling step in Fastfile.

## Post-Deploy

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to TestFlight tab
3. Wait for build processing (~5-15 minutes)
4. Add testers and distribute

## For More Details

See [DEPLOYMENT.md](../../../DEPLOYMENT.md) in the project root.
