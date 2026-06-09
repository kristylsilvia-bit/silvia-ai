import Foundation

struct ChatAttachment: Identifiable, Codable, Equatable {
    enum Kind: String, Codable {
        case image
        case file
    }

    let id: UUID
    var fileName: String
    var mimeType: String
    var data: Data
    var kind: Kind

    init(
        id: UUID = UUID(),
        fileName: String,
        mimeType: String,
        data: Data,
        kind: Kind
    ) {
        self.id = id
        self.fileName = fileName
        self.mimeType = mimeType
        self.data = data
        self.kind = kind
    }

    var isImage: Bool {
        kind == .image || mimeType.hasPrefix("image/")
    }
}

struct ChatMessage: Identifiable, Codable, Equatable {
    let id: UUID
    var role: ChatRole
    var content: String
    var createdAt: Date
    var modelId: String?
    var imageData: Data?
    var imagePrompt: String?
    var attachments: [ChatAttachment]
    var isError: Bool

    init(
        id: UUID = UUID(),
        role: ChatRole,
        content: String,
        createdAt: Date = Date(),
        modelId: String? = nil,
        imageData: Data? = nil,
        imagePrompt: String? = nil,
        attachments: [ChatAttachment] = [],
        isError: Bool = false
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.createdAt = createdAt
        self.modelId = modelId
        self.imageData = imageData
        self.imagePrompt = imagePrompt
        self.attachments = attachments
        self.isError = isError
    }

    enum CodingKeys: String, CodingKey {
        case id
        case role
        case content
        case createdAt
        case modelId
        case imageData
        case imagePrompt
        case attachments
        case isError
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        role = try container.decode(ChatRole.self, forKey: .role)
        content = try container.decode(String.self, forKey: .content)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        modelId = try container.decodeIfPresent(String.self, forKey: .modelId)
        imageData = try container.decodeIfPresent(Data.self, forKey: .imageData)
        imagePrompt = try container.decodeIfPresent(String.self, forKey: .imagePrompt)
        attachments = try container.decodeIfPresent([ChatAttachment].self, forKey: .attachments) ?? []
        isError = try container.decodeIfPresent(Bool.self, forKey: .isError) ?? false
    }
}
