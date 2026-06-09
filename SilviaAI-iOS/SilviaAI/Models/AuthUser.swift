import Foundation

struct AuthUser: Codable, Equatable, Identifiable {
    let uid: String
    let email: String
    let displayName: String?
    let photoURL: URL?
    let provider: String?
    let idToken: String
    let refreshToken: String

    var id: String { uid }

    var displayLabel: String {
        let name = displayName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return name.isEmpty ? email : name
    }

    var providerLabel: String {
        provider == "google.com" ? "Google" : "Email"
    }
}
