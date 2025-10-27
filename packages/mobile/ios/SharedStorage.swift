import Foundation
import React

@objc(SharedStorage)
class SharedStorage: NSObject {

  @objc
  func getString(_ key: String, appGroup: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroup) else {
      rejecter("ERROR", "Failed to access App Group: \(appGroup)", nil)
      return
    }

    let value = userDefaults.string(forKey: key)
    resolver(value)
  }

  @objc
  func setString(_ key: String, value: String, appGroup: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroup) else {
      rejecter("ERROR", "Failed to access App Group: \(appGroup)", nil)
      return
    }

    userDefaults.set(value, forKey: key)
    userDefaults.synchronize()
    resolver(nil)
  }

  @objc
  func removeKey(_ key: String, appGroup: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let userDefaults = UserDefaults(suiteName: appGroup) else {
      rejecter("ERROR", "Failed to access App Group: \(appGroup)", nil)
      return
    }

    userDefaults.removeObject(forKey: key)
    userDefaults.synchronize()
    resolver(nil)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
