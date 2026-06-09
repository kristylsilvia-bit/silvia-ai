import Foundation

final class ChatStorageService {
    private let fileURL: URL

    init(userID: String? = nil, fileManager: FileManager = .default) {
        let documents = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        self.fileURL = documents.appendingPathComponent(Self.fileName(for: userID))
    }

    func loadMessages() -> [ChatMessage] {
        guard let data = try? Data(contentsOf: fileURL) else { return [] }
        return (try? JSONDecoder().decode([ChatMessage].self, from: data)) ?? []
    }

    func saveMessages(_ messages: [ChatMessage]) {
        guard let data = try? JSONEncoder().encode(messages) else { return }
        try? data.write(to: fileURL, options: [.atomic])
    }

    func clearMessages() {
        try? FileManager.default.removeItem(at: fileURL)
    }

    private static func fileName(for userID: String?) -> String {
        guard let userID, !userID.isEmpty else { return Constants.storageFileName }
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        let safe = userID.unicodeScalars.map { allowed.contains($0) ? String($0) : "_" }.joined()
        return "silvia-chat-history-\(safe).json"
    }
}
