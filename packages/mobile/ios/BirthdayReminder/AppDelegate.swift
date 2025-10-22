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
    #if DEBUG
      // In development, use Metro bundler
      return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      // In production, use the bundled JS file
      return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
