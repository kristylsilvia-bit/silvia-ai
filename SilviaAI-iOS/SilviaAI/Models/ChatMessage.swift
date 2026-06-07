import Foundation

struct ChatMessage: Identifiable, Codable, Equatable {
    let id: UUID
    var role: ChatRole
    var content: String
    var createdAt: Date
    var modelId: String?
    var imageData: Data?
    var isError: Bool

    init(
        id: UUID = UUID(),
        role: ChatRole,
        content: String,
        createdAt: Date = Date(),
        modelId: String? = nil,
        imageData: Data? = nil,
        isError: Bool = false
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.createdAt = createdAt
        self.modelId = modelId
        self.imageData = imageData
        self.isError = isError
    }
}
