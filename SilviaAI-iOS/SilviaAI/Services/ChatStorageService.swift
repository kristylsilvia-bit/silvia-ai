import Foundation

final class ChatStorageService {
    private let fileURL: URL

    init(fileManager: FileManager = .default) {
        let documents = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        self.fileURL = documents.appendingPathComponent(Constants.storageFileName)
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
}
