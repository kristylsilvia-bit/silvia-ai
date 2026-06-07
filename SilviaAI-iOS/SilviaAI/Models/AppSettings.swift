import Foundation

struct AppSettings: Codable, Equatable {
    var selectedModel: AIModel.ID
    var systemPrompt: String
    var voiceInputEnabled: Bool
    var spokenRepliesEnabled: Bool

    static let defaultSystemPrompt = """
    You are Silvia AI — a polished, warm, highly capable AI assistant. Be clear, friendly, practical, and concise unless the user asks for depth. Preserve the premium chat-studio personality: confident, helpful, creative, and safe. Use Markdown when it improves readability, especially for lists, tables, and code.
    """

    static let `default` = AppSettings(
        selectedModel: .auto,
        systemPrompt: defaultSystemPrompt,
        voiceInputEnabled: false,
        spokenRepliesEnabled: false
    )
}

struct AIModel: Identifiable, Hashable, Codable {
    enum ID: String, CaseIterable, Codable, Identifiable {
        case auto
        case flash
        case pro
        case image

        var id: String { rawValue }
    }

    let id: ID
    let apiName: String?
    let displayName: String
    let shortName: String
    let badge: String
    let description: String

    static let all: [AIModel] = [
        AIModel(
            id: .auto,
            apiName: nil,
            displayName: "Auto · Smart Routing",
            shortName: "Smart",
            badge: "Default",
            description: "Silvia picks Flash for chat, Pro for files, and Nano Banana for image requests."
        ),
        AIModel(
            id: .flash,
            apiName: "gemini-3.5-flash",
            displayName: "Gemini 3.5 Flash",
            shortName: "Chat",
            badge: "Fast",
            description: "General chat, writing, and quick reasoning."
        ),
        AIModel(
            id: .pro,
            apiName: "gemini-3.1-pro-preview",
            displayName: "Gemini 3.1 Pro",
            shortName: "Vision",
            badge: "Files",
            description: "Deep document, image, and long-context analysis."
        ),
        AIModel(
            id: .image,
            apiName: "gemini-3.1-flash-image",
            displayName: "Nano Banana 2",
            shortName: "Image",
            badge: "Create",
            description: "Image generation and creative visual prompts."
        )
    ]

    static func model(for id: ID) -> AIModel {
        all.first { $0.id == id } ?? all[0]
    }
}
