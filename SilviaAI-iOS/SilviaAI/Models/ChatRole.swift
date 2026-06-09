import Foundation

enum ChatRole: String, Codable, CaseIterable, Identifiable {
    case user
    case assistant
    case system

    var id: String { rawValue }
}
