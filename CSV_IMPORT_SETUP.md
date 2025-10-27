# CSV Import Setup Guide

This guide walks through setting up the iOS Share Extension for CSV birthday imports.

## Overview

The CSV import feature allows users to share CSV files from the Files app (or any app) directly to the Birthday Reminder app. The implementation uses:

- **iOS Share Extension**: Native share target that receives shared files
- **App Groups**: Shared storage between the main app and extension
- **React Native Screens**: Import preview and results display
- **Deep Linking**: Opens main app after file is shared

## Files Created

### React Native / TypeScript
- `src/utils/csvParser.ts` - CSV parsing with validation
- `src/utils/sharedStorage.ts` - App Groups storage interface
- `src/screens/ImportPreviewScreen.tsx` - Import UI
- `src/App.tsx` - Updated navigation

### iOS Native (Swift/Objective-C)
- `ios/BirthdayReminder/SharedStorage.swift` - Native storage module
- `ios/BirthdayReminder/SharedStorage.m` - RN bridge
- `ios/BirthdayReminder/BirthdayReminder.entitlements` - App capabilities
- `ios/BirthdayImport/ShareViewController.swift` - Share extension handler
- `ios/BirthdayImport/Info.plist` - Extension configuration
- `ios/BirthdayImport/BirthdayImport.entitlements` - Extension capabilities

## Manual Xcode Setup Required

Since the Share Extension target needs to be added to the Xcode project, follow these steps:

### 1. Open Xcode Project

```bash
cd packages/mobile/ios
open BirthdayReminder.xcworkspace
```

### 2. Add Share Extension Target

1. In Xcode, select the **BirthdayReminder** project in the navigator
2. Click the **+** button at the bottom of the targets list
3. Select **iOS** > **Share Extension**
4. Click **Next**
5. Configure the extension:
   - **Product Name**: `BirthdayImport`
   - **Team**: Your development team
   - **Organization Identifier**: `com.birthdayreminder`
   - **Bundle Identifier**: `com.birthdayreminder.BirthdayImport`
   - **Language**: Swift
   - Click **Finish**
6. When prompted "Activate 'BirthdayImport' scheme?", click **Activate**

### 3. Replace Generated Files

The extension wizard creates default files. Replace them with the files we created:

1. In Xcode, select the `BirthdayImport` folder in the navigator
2. Delete these auto-generated files (Move to Trash):
   - `ShareViewController.swift` (we'll use our custom version)
   - `Info.plist` (we'll use our custom version)
   - Any `MainInterface.storyboard` files

3. Add our custom files to the `BirthdayImport` target:
   - Right-click `BirthdayImport` folder > **Add Files to "BirthdayReminder"...**
   - Navigate to `packages/mobile/ios/BirthdayImport/`
   - Select all files:
     - `ShareViewController.swift`
     - `Info.plist`
     - `BirthdayImport.entitlements`
   - **Important**: Check **Copy items if needed**
   - For **Added to targets**, check **BirthdayImport** ONLY
   - Click **Add**

### 4. Add Native Module Files to Main App

1. Right-click the `BirthdayReminder` folder > **Add Files to "BirthdayReminder"...**
2. Select these files:
   - `ios/BirthdayReminder/SharedStorage.swift`
   - `ios/BirthdayReminder/SharedStorage.m`
   - `ios/BirthdayReminder/BirthdayReminder.entitlements`
3. For **Added to targets**, check **BirthdayReminder** ONLY
4. Click **Add**

### 5. Configure App Groups

#### For Main App (BirthdayReminder):
1. Select **BirthdayReminder** project > **BirthdayReminder** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability** > **App Groups**
4. Click **+** under App Groups
5. Enter: `group.com.birthdayreminder.shared`
6. Click **OK**
7. Ensure the checkbox next to the group is checked
8. Under **Code Signing Entitlements**, select `BirthdayReminder.entitlements`

#### For Share Extension (BirthdayImport):
1. Select **BirthdayReminder** project > **BirthdayImport** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability** > **App Groups**
4. Click **+** under App Groups
5. Enter: `group.com.birthdayreminder.shared` (same as main app)
6. Click **OK**
7. Ensure the checkbox next to the group is checked
8. Under **Code Signing Entitlements**, select `BirthdayImport.entitlements`

### 6. Update Build Settings

#### For Share Extension:
1. Select **BirthdayReminder** project > **BirthdayImport** target
2. Go to **Build Settings** tab
3. Search for "Swift Language Version"
4. Set **Swift Language Version** to **Swift 5** (or your project's Swift version)

### 7. Update Deployment Info

#### For Share Extension:
1. Select **BirthdayReminder** project > **BirthdayImport** target
2. Go to **General** tab
3. Under **Deployment Info**:
   - Set **iOS Deployment Target** to match main app (e.g., 13.4)

### 8. Build and Run

1. Select the **BirthdayReminder** scheme (not BirthdayImport)
2. Build the project (Cmd+B)
3. Fix any build errors if they occur
4. Run on a device or simulator (Cmd+R)

## Testing the Feature

### 1. Create a Test CSV File

Create a file named `test.csv` with this content:

```csv
First Name;Last Name;Birthday
John;Doe;1990-05-15
Jane;Smith;3-20
Bob;Johnson;1985-12-25
Alice;;7-4
```

### 2. Import via Share Sheet

1. Save the CSV file to Files app on your device/simulator
2. Open Files app
3. Long-press the CSV file
4. Tap **Share**
5. Select **Birthday Reminder** from the share sheet
6. The Birthday Reminder app should open and show the import preview
7. Review the parsed birthdays
8. Tap **Import**
9. Check the results screen for success/skipped/error counts

### 3. Verify Import

1. Go back to the Home screen
2. Verify the imported birthdays appear in the list
3. Check that duplicates were skipped
4. Verify dates are correct

## CSV Format

The CSV parser expects:

- **Delimiter**: Semicolon (`;`)
- **Header row**: `First Name;Last Name;Birthday`
- **Birthday formats**:
  - Full date: `YYYY-MM-DD` (e.g., `1990-05-15`)
  - Month/Day only: `M-D` or `MM-DD` (e.g., `3-20` or `03-20`)
- **Last Name**: Can be empty
- **Encoding**: UTF-8 (supports special characters)

## Behavior

- **Validation**: Invalid rows are skipped with error details shown
- **Duplicates**: Entries with matching names (First + Last) are skipped
- **Name Format**: First and Last names are combined for the birthday entry
- **Error Handling**: Shows detailed errors for invalid dates, missing fields, etc.

## Troubleshooting

### Share Extension Doesn't Appear

1. Verify App Groups are configured for both targets with the same identifier
2. Check that entitlements files are properly linked in Build Settings
3. Clean build folder (Shift+Cmd+K) and rebuild
4. Restart device/simulator

### Build Errors

- **"No such module 'React'"**: Make sure SharedStorage files are only in the main app target, not the extension
- **Swift version mismatch**: Ensure both targets use the same Swift version
- **Entitlements not found**: Check file paths in Build Settings > Code Signing Entitlements

### Import Not Working

1. Check Xcode console for errors when sharing
2. Verify App Groups identifier matches in code (`group.com.birthdayreminder.shared`)
3. Ensure you're logged in to the app before importing
4. Check that CSV format matches expected structure

### No Deep Link to App

1. Verify URL scheme is registered in main app Info.plist
2. Check that `birthdayreminder://` scheme matches the ShareViewController code
3. Ensure main app is installed on the device

## Development Notes

- Share Extension runs in a separate process with limited memory
- Large CSV files (>1000 entries) should be tested for performance
- The extension cannot directly access React Native - it uses shared storage
- Deep linking is required to open the main app after receiving the file

## Future Enhancements

- Support for additional CSV formats (comma-delimited)
- Progress indicator for large imports
- Undo import feature
- Export functionality
- Cloud sync for imports
