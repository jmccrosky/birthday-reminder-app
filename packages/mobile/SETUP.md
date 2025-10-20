# Mobile App Setup Guide

## Prerequisites

1. **Install Homebrew Ruby** (not system Ruby):
   ```bash
   brew install ruby
   ```

2. **Add Homebrew Ruby to your PATH**:
   ```bash
   echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
   echo 'export PATH="/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Verify Ruby version** (should be 3.4.x):
   ```bash
   ruby --version
   ```

## Initial Setup

### 1. Install Dependencies

```bash
# From the mobile directory
cd packages/mobile

# Install Ruby dependencies
bundle install

# Install Node dependencies
pnpm install
```

### 2. Initialize React Native iOS Project

Since this is a fresh React Native project, you need to initialize the iOS native code:

```bash
# Initialize React Native project
npx @react-native-community/cli@latest init BirthdayReminder --skip-install --template react-native@0.73.2

# Copy the ios folder to our project
cp -r BirthdayReminder/ios ./

# Clean up
rm -rf BirthdayReminder
```

**OR** manually create the Xcode project:

```bash
# Install Xcode command line tools
xcode-select --install

# Run React Native to auto-generate iOS project
npx react-native run-ios
# This will create the ios folder and Xcode project automatically
```

### 3. Install CocoaPods Dependencies

```bash
cd ios
bundle exec pod install
cd ..
```

### 4. Run the App

```bash
# Start Metro bundler
pnpm start

# In another terminal, run iOS app
pnpm ios
```

## Quick Setup (Alternative)

If you want to use the React Native CLI to set everything up:

```bash
cd packages/mobile

# This will create the ios/ folder and install pods automatically
npx react-native run-ios
```

## Troubleshooting

### Ruby Version Issues

If you see errors about Ruby version or ActiveSupport:

1. Make sure you're using Homebrew Ruby, not system Ruby
2. Check: `which ruby` should show `/opt/homebrew/opt/ruby/bin/ruby`
3. Check: `ruby --version` should show 3.4.x

### CocoaPods Issues

If `pod install` fails:

```bash
# Clean CocoaPods cache
rm -rf ~/Library/Caches/CocoaPods
rm -rf ios/Pods ios/Podfile.lock

# Reinstall
cd ios
bundle exec pod install --repo-update
```

### Metro Bundler Issues

If Metro won't start:

```bash
# Clean Metro cache
pnpm start --reset-cache
```

## Next Steps

Once the app runs successfully:

1. Update API URL in `src/services/api.ts` to point to your backend
2. Configure Apple Developer account in `fastlane/.env`
3. Set up Fastlane Match for code signing
4. Test push notifications on physical device
