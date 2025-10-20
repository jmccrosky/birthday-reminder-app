import UIKit
import React_RCTAppDelegate
import React

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    self.moduleName = "BirthdayReminder"
    self.initialProps = [:]
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge!) -> URL! {
    // Try Metro bundler first (for development)
    if let metroURL = URL(string: "http://localhost:8081/index.bundle?platform=ios") {
      return metroURL
    }

    // Fallback to bundled JS (for production)
    if let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      return bundleURL
    }

    fatalError("Unable to find React Native bundle - neither Metro nor bundled JS found")
  }
}
