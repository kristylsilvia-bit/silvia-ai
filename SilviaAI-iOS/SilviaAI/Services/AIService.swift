import Foundation

struct GeminiRequestPart: Codable {
    var text: String?
}

struct GeminiContent: Codable {
    let role: String
    let parts: [GeminiRequestPart]
}

private struct GeminiResponse: Decodable {
    struct Candidate: Decodable {
        struct Content: Decodable {
            struct InlineData: Decodable {
                let mimeType: String?
                let data: String?

                enum CodingKeys: String, CodingKey {
                    case mimeType
                    case data
                }
            }
            struct Part: Decodable {
                let text: String?
                let inlineData: InlineData?
            }
            let parts: [Part]?
        }
        let content: Content?
    }
    let candidates: [Candidate]?
}

struct AIResponse {
    let text: String
    let imageData: Data?
}

final class AIService {
    private let client: APIClient

    init(client: APIClient = APIClient()) {
        self.client = client
    }

    func generateReply(messages: [ChatMessage], settings: AppSettings) async throws -> AIResponse {
        let modelID = routeModel(selected: settings.selectedModel, latestText: messages.last?.content ?? "")
        let model = AIModel.model(for: modelID)
        guard let apiName = model.apiName else { throw APIClientError.emptyResponse }
        guard let apiKey = Self.geminiAPIKey, !apiKey.isEmpty, apiKey != "PASTE_YOUR_GEMINI_API_KEY_HERE" else {
            throw APIClientError.missingAPIKey
        }

        guard var components = URLComponents(url: Constants.apiBaseURL.appendingPathComponent("\(apiName):generateContent"), resolvingAgainstBaseURL: false) else {
            throw APIClientError.invalidURL
        }
        components.queryItems = [URLQueryItem(name: "key", value: apiKey)]
        guard let url = components.url else { throw APIClientError.invalidURL }

        let contents = buildContents(messages: messages, systemPrompt: settings.systemPrompt)
        var generationConfig: [String: Any] = [
            "temperature": 0.85,
            "maxOutputTokens": 8192
        ]
        if modelID == .image {
            generationConfig["responseModalities"] = ["TEXT", "IMAGE"]
        }

        let body: [String: Any] = [
            "contents": contents.map { content in
                [
                    "role": content.role,
                    "parts": content.parts.map { ["text": $0.text ?? ""] }
                ]
            },
            "generationConfig": generationConfig
        ]

        let data = try await client.postJSON(to: url, body: body)
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try decoder.decode(GeminiResponse.self, from: data)
        let parts = decoded.candidates?.first?.content?.parts ?? []
        let text = parts.compactMap(\.text).joined()
        let imageData = parts.compactMap { part -> Data? in
            guard let base64 = part.inlineData?.data else { return nil }
            return Data(base64Encoded: base64)
        }.first
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty || imageData != nil else { throw APIClientError.emptyResponse }
        return AIResponse(text: trimmed.isEmpty ? "Generated an image for you." : trimmed, imageData: imageData)
    }

    func routedModel(for text: String, selected: AIModel.ID) -> AIModel.ID {
        routeModel(selected: selected, latestText: text)
    }

    private func routeModel(selected: AIModel.ID, latestText: String) -> AIModel.ID {
        guard selected == .auto else { return selected }
        let lower = latestText.lowercased()
        let imageWords = ["draw", "generate image", "create image", "make an image", "logo", "poster", "illustration", "photo", "render"]
        if imageWords.contains(where: { lower.contains($0) }) { return .image }
        let proWords = ["analyze", "document", "pdf", "spreadsheet", "vision", "long context", "deep reasoning"]
        if proWords.contains(where: { lower.contains($0) }) { return .pro }
        return .flash
    }

    private func buildContents(messages: [ChatMessage], systemPrompt: String) -> [GeminiContent] {
        var contents: [GeminiContent] = []
        let prompt = systemPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        if !prompt.isEmpty {
            contents.append(GeminiContent(role: "user", parts: [GeminiRequestPart(text: prompt)]))
            contents.append(GeminiContent(role: "model", parts: [GeminiRequestPart(text: "Understood. I will respond as Silvia AI.")]))
        }

        for message in messages.suffix(24) {
            switch message.role {
            case .user:
                contents.append(GeminiContent(role: "user", parts: [GeminiRequestPart(text: message.content)]))
            case .assistant:
                contents.append(GeminiContent(role: "model", parts: [GeminiRequestPart(text: message.content)]))
            case .system:
                contents.append(GeminiContent(role: "user", parts: [GeminiRequestPart(text: message.content)]))
            }
        }
        return contents
    }

    private static var geminiAPIKey: String? {
        guard let url = Bundle.main.url(forResource: Constants.configFileName, withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil),
              let dictionary = plist as? [String: Any]
        else { return nil }
        return dictionary["GEMINI_API_KEY"] as? String
    }
}
