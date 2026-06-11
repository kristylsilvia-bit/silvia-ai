import Foundation

enum Constants {
    static let appName = "Silvia AI"
    static let onlineStatus = "Online"
    static let inputPlaceholder = "Ask Silvia anything..."
    static let storageFileName = "silvia-chat-history.json"
    static let settingsStorageKey = "silvia.app.settings.v1"
    static let authUserStorageKey = "silvia.auth.user.v1"
    static let guestModeStorageKey = "silvia.auth.guestAccepted.v1"
    static let configFileName = "Config"
    static let apiBaseURL = URL(string: "https://generativelanguage.googleapis.com/v1beta/models")!
}
