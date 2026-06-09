import Foundation

struct GeminiRequestPart: Codable {
    var text: String?
    var inlineData: GeminiInlineData?
}

struct GeminiInlineData: Codable {
    let mimeType: String
    let data: String
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
    let modelID: AIModel.ID
    let imagePrompt: String?
}

private struct ImageGenerationContext {
    let originalPrompt: String
    let description: String
    let imageData: Data
}

final class AIService {
    private let client: APIClient

    init(client: APIClient = APIClient()) {
        self.client = client
    }

    func generateReply(messages: [ChatMessage], settings: AppSettings) async throws -> AIResponse {
        let latestUserMessage = messages.last(where: { $0.role == .user })
        let latestText = latestUserMessage?.content ?? messages.last?.content ?? ""
        let recentImageContext = recentGeneratedImageContext(in: messages)
        let modelID = routeModel(
            selected: settings.selectedModel,
            latestText: latestText,
            hasAttachments: latestUserMessage?.attachments.isEmpty == false,
            hasRecentGeneratedImage: recentImageContext != nil
        )
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

        let imagePrompt = modelID == .image
            ? imagePrompt(for: latestText, context: recentImageContext)
            : nil
        let contents = modelID == .image
            ? buildImageContents(
                prompt: imagePrompt ?? latestText,
                attachments: latestUserMessage?.attachments ?? [],
                referenceImageData: shouldUseImageContext(for: latestText, context: recentImageContext) ? recentImageContext?.imageData : nil
            )
            : buildContents(messages: messages, systemPrompt: settings.systemPrompt)
        var generationConfig: [String: Any] = [
            "temperature": 0.85,
            "maxOutputTokens": 8192
        ]
        if modelID == .image {
            generationConfig["responseModalities"] = ["IMAGE", "TEXT"]
        }

        let body: [String: Any] = [
            "contents": contents.map { content in
                [
                    "role": content.role,
                    "parts": content.parts.map(Self.jsonPart)
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
        return AIResponse(
            text: trimmed.isEmpty ? "Generated an image for you." : trimmed,
            imageData: imageData,
            modelID: modelID,
            imagePrompt: imageData == nil ? nil : imagePrompt
        )
    }

    func routedModel(for text: String, selected: AIModel.ID) -> AIModel.ID {
        routeModel(selected: selected, latestText: text, hasAttachments: false, hasRecentGeneratedImage: false)
    }

    func routedModel(for text: String, attachments: [ChatAttachment], selected: AIModel.ID) -> AIModel.ID {
        routeModel(selected: selected, latestText: text, hasAttachments: !attachments.isEmpty, hasRecentGeneratedImage: false)
    }

    func routedModel(for text: String, attachments: [ChatAttachment], messages: [ChatMessage], selected: AIModel.ID) -> AIModel.ID {
        routeModel(
            selected: selected,
            latestText: text,
            hasAttachments: !attachments.isEmpty,
            hasRecentGeneratedImage: recentGeneratedImageContext(in: messages) != nil
        )
    }

    private func routeModel(
        selected: AIModel.ID,
        latestText: String,
        hasAttachments: Bool,
        hasRecentGeneratedImage: Bool
    ) -> AIModel.ID {
        guard selected == .auto else { return selected }
        if shouldRouteToImageModel(latestText, hasRecentGeneratedImage: hasRecentGeneratedImage) { return .image }
        if hasAttachments { return .pro }
        let lower = latestText.lowercased()
        let proWords = ["analyze", "document", "pdf", "spreadsheet", "vision", "long context", "deep reasoning"]
        if proWords.contains(where: { lower.contains($0) }) { return .pro }
        return .flash
    }

    func isImageGenerationRequest(_ text: String) -> Bool {
        let pattern = #"\b(generate|create|make|draw|paint|render|design|produce|imagine)\b[^.?!]*\b(image|picture|photo|art|artwork|illustration|logo|icon|wallpaper|poster|drawing|painting|render|graphic|scene|portrait|sketch)\b|^/(image|img|imagine)\b|\bnano banana\b"#
        return text.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil
    }

    func isImageEditFollowUp(_ text: String, hasRecentGeneratedImage: Bool) -> Bool {
        guard hasRecentGeneratedImage else { return false }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isImageGenerationRequest(trimmed) else { return false }

        let directEditPattern = #"\b(edit|modify|update|change|alter|revise|adjust|transform|convert|turn|make|recolor|colour|color|stylize|style|cartoonify|replace|swap|remove|erase|add|put|give)\b"#
        let visualCuePattern = #"\b(it|this|that|image|picture|photo|background|foreground|subject|scene|style|cartoon|anime|realistic|cinematic|black|white|red|blue|green|yellow|purple|pink|orange|hat|glasses|shirt|dog|cat|person|face|sky|lighting|color|colour)\b"#
        let hasEditVerb = trimmed.range(of: directEditPattern, options: [.regularExpression, .caseInsensitive]) != nil
        let hasVisualCue = trimmed.range(of: visualCuePattern, options: [.regularExpression, .caseInsensitive]) != nil
        return hasEditVerb && hasVisualCue
    }

    func shouldRouteToImageModel(_ text: String, hasRecentGeneratedImage: Bool) -> Bool {
        isImageGenerationRequest(text) || isImageEditFollowUp(text, hasRecentGeneratedImage: hasRecentGeneratedImage)
    }

    private func buildImageFollowUpPrompt(userRequest: String, context: ImageGenerationContext) -> String {
        let originalPrompt = context.originalPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        let description = context.description.trimmingCharacters(in: .whitespacesAndNewlines)
        let change = userRequest.trimmingCharacters(in: .whitespacesAndNewlines)

        return """
        Create a new image by applying the user's requested visual change to the most recent generated image. Use the attached previous image as the visual base/reference when the model supports image input. If direct image editing is not available, regenerate a new image that preserves the original subject/composition while applying the requested change. Return an actual image, not instructions or a prompt for another tool.

        Original image prompt:
        \(originalPrompt.isEmpty ? "Not available." : originalPrompt)

        Latest generated image context:
        \(description.isEmpty ? "A previously generated image in this chat." : description)

        User requested change:
        \(change)
        """
    }

    private func buildImageContents(
        prompt: String,
        attachments: [ChatAttachment],
        referenceImageData: Data? = nil
    ) -> [GeminiContent] {
        let trimmed = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        let imagePrompt = """
        Create the image requested by the user. Return the generated image plus, only if helpful, a short caption. Do not respond with instructions for another image generator.

        User request: \(trimmed)
        """
        let referenceParts: [GeminiRequestPart] = referenceImageData.map {
            [
                GeminiRequestPart(
                    text: nil,
                    inlineData: GeminiInlineData(mimeType: Self.imageMimeType(for: $0), data: $0.base64EncodedString())
                )
            ]
        } ?? []
        return [GeminiContent(role: "user", parts: [GeminiRequestPart(text: imagePrompt)] + referenceParts + attachmentParts(attachments))]
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
                contents.append(GeminiContent(role: "user", parts: [GeminiRequestPart(text: message.content)] + attachmentParts(message.attachments)))
            case .assistant:
                contents.append(GeminiContent(role: "model", parts: [GeminiRequestPart(text: message.content)]))
            case .system:
                contents.append(GeminiContent(role: "user", parts: [GeminiRequestPart(text: message.content)]))
            }
        }
        return contents
    }

    private func attachmentParts(_ attachments: [ChatAttachment]) -> [GeminiRequestPart] {
        attachments.map {
            GeminiRequestPart(
                text: nil,
                inlineData: GeminiInlineData(mimeType: $0.mimeType, data: $0.data.base64EncodedString())
            )
        }
    }

    private static func jsonPart(_ part: GeminiRequestPart) -> [String: Any] {
        if let inlineData = part.inlineData {
            return [
                "inline_data": [
                    "mime_type": inlineData.mimeType,
                    "data": inlineData.data
                ]
            ]
        }
        return ["text": part.text ?? ""]
    }

    private func imagePrompt(for latestText: String, context: ImageGenerationContext?) -> String {
        guard let context, isImageEditFollowUp(latestText, hasRecentGeneratedImage: true) else {
            return latestText
        }
        return buildImageFollowUpPrompt(userRequest: latestText, context: context)
    }

    private func shouldUseImageContext(for latestText: String, context: ImageGenerationContext?) -> Bool {
        context != nil && isImageEditFollowUp(latestText, hasRecentGeneratedImage: true)
    }

    private func recentGeneratedImageContext(in messages: [ChatMessage]) -> ImageGenerationContext? {
        let recentMessages = messages.suffix(12)
        guard let imageMessage = recentMessages.last(where: { message in
            message.role == .assistant && message.imageData != nil && !message.isError
        }), let imageData = imageMessage.imageData else {
            return nil
        }

        let imageIndex = messages.lastIndex { $0.id == imageMessage.id }
        let previousPrompt = imageIndex.flatMap { index in
            messages[..<index].last(where: { $0.role == .user })?.content
        }
        return ImageGenerationContext(
            originalPrompt: imageMessage.imagePrompt ?? previousPrompt ?? "",
            description: imageMessage.content,
            imageData: imageData
        )
    }

    private static func imageMimeType(for data: Data) -> String {
        if data.starts(with: [0x89, 0x50, 0x4E, 0x47]) { return "image/png" }
        if data.starts(with: [0xFF, 0xD8, 0xFF]) { return "image/jpeg" }
        if data.count > 12,
           String(data: data.prefix(4), encoding: .ascii) == "RIFF",
           String(data: data.dropFirst(8).prefix(4), encoding: .ascii) == "WEBP" {
            return "image/webp"
        }
        return "image/png"
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
