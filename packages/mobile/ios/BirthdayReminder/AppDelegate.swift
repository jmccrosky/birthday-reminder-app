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
    return URL(string: "http://localhost:8081/index.bundle?platform=ios")!
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")!
#endif
  }
}
