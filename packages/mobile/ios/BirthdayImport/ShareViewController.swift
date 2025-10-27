import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {

    let appGroupIdentifier = "group.com.birthdayreminder.shared"
    let sharedKey = "pendingCSVImport"

    override func isContentValid() -> Bool {
        return true
    }

    override func didSelectPost() {
        if let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
           let itemProvider = extensionItem.attachments?.first {

            // Check if it's a file URL
            if itemProvider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
                itemProvider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { [weak self] (item, error) in
                    if let url = item as? URL {
                        self?.handleFileURL(url)
                    } else {
                        self?.showErrorAndClose("Failed to load file")
                    }
                }
            }
            // Check if it's CSV data
            else if itemProvider.hasItemConformingToTypeIdentifier(UTType.commaSeparatedText.identifier) {
                itemProvider.loadItem(forTypeIdentifier: UTType.commaSeparatedText.identifier, options: nil) { [weak self] (item, error) in
                    if let url = item as? URL {
                        self?.handleFileURL(url)
                    } else if let data = item as? Data {
                        self?.handleCSVData(data, fileName: "imported.csv")
                    } else {
                        self?.showErrorAndClose("Failed to load CSV data")
                    }
                }
            }
            // Check if it's plain text
            else if itemProvider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                itemProvider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (item, error) in
                    if let text = item as? String {
                        if let data = text.data(using: .utf8) {
                            self?.handleCSVData(data, fileName: "imported.csv")
                        } else {
                            self?.showErrorAndClose("Failed to process text")
                        }
                    } else {
                        self?.showErrorAndClose("Invalid text format")
                    }
                }
            }
            else {
                showErrorAndClose("Unsupported file type. Please share a CSV file.")
            }
        } else {
            showErrorAndClose("No file attached")
        }
    }

    func handleFileURL(_ url: URL) {
        do {
            // Read the file content
            let data = try Data(contentsOf: url)
            let fileName = url.lastPathComponent
            handleCSVData(data, fileName: fileName)
        } catch {
            showErrorAndClose("Failed to read file: \(error.localizedDescription)")
        }
    }

    func handleCSVData(_ data: Data, fileName: String) {
        guard let content = String(data: data, encoding: .utf8) else {
            showErrorAndClose("Failed to decode file content")
            return
        }

        // Store in App Group shared storage
        let importData: [String: Any] = [
            "csvContent": content,
            "fileName": fileName,
            "timestamp": Date().timeIntervalSince1970 * 1000 // milliseconds
        ]

        do {
            let jsonData = try JSONSerialization.data(withJSONObject: importData, options: [])
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                if let userDefaults = UserDefaults(suiteName: appGroupIdentifier) {
                    userDefaults.set(jsonString, forKey: sharedKey)
                    userDefaults.synchronize()

                    // Open the main app
                    openMainApp()
                } else {
                    showErrorAndClose("Failed to access shared storage")
                }
            }
        } catch {
            showErrorAndClose("Failed to process import data: \(error.localizedDescription)")
        }
    }

    func openMainApp() {
        // Create deep link URL to open main app
        if let url = URL(string: "birthdayreminder://import") {
            var responder: UIResponder? = self
            while responder != nil {
                if let application = responder as? UIApplication {
                    application.perform(#selector(UIApplication.openURL(_:)), with: url, afterDelay: 0)
                    break
                }
                responder = responder?.next
            }
        }

        // Close the extension
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    func showErrorAndClose(_ message: String) {
        DispatchQueue.main.async {
            let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
                self?.extensionContext?.cancelRequest(withError: NSError(domain: "BirthdayImport", code: -1, userInfo: [NSLocalizedDescriptionKey: message]))
            })
            self.present(alert, animated: true)
        }
    }

    override func configurationItems() -> [Any]! {
        // No configuration items needed
        return []
    }

}
