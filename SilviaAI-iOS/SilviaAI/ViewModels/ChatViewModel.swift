import Foundation
import UIKit

@MainActor
final class ChatViewModel: ObservableObject {
    @Published private(set) var messages: [ChatMessage]
    @Published var draft = ""
    @Published private(set) var isLoading = false
    @Published var errorBanner: String?

    private let aiService: AIService
    private let storage: ChatStorageService
    private let settingsViewModel: SettingsViewModel
    private let speechService = SpeechService()
    private var lastUserMessage: ChatMessage?

    init(
        aiService: AIService = AIService(),
        storage: ChatStorageService = ChatStorageService(),
        settingsViewModel: SettingsViewModel
    ) {
        self.aiService = aiService
        self.storage = storage
        self.settingsViewModel = settingsViewModel
        let stored = storage.loadMessages()
        self.messages = stored
    }

    var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isLoading
    }

    func sendCurrentDraft() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isLoading else { return }
        draft = ""
        await send(text)
    }

    func sendSuggestion(_ text: String) {
        draft = text
    }

    func regenerateLastResponse() async {
        guard !isLoading else { return }
        if let index = messages.lastIndex(where: { $0.role == .assistant }) {
            messages.remove(at: index)
        }
        if let lastUserMessage {
            await requestAssistantReply(after: lastUserMessage)
        } else if let last = messages.last(where: { $0.role == .user }) {
            await requestAssistantReply(after: last)
        }
    }

    func clearChat() {
        messages = []
        lastUserMessage = nil
        storage.clearMessages()
        errorBanner = nil
        Haptics.success()
    }

    func copy(_ message: ChatMessage) {
        UIPasteboard.general.string = message.content
        Haptics.success()
    }

    private func send(_ text: String) async {
        let userMessage = ChatMessage(role: .user, content: text)
        messages.append(userMessage)
        lastUserMessage = userMessage
        save()
        Haptics.send()
        await requestAssistantReply(after: userMessage)
    }

    private func requestAssistantReply(after userMessage: ChatMessage) async {
        isLoading = true
        errorBanner = nil
        let selected = settingsViewModel.settings.selectedModel
        let routed = aiService.routedModel(for: userMessage.content, selected: selected)
        do {
            let response = try await aiService.generateReply(messages: messages, settings: settingsViewModel.settings)
            let assistant = ChatMessage(role: .assistant, content: response.text, modelId: routed.rawValue, imageData: response.imageData)
            messages.append(assistant)
            save()
            if settingsViewModel.settings.spokenRepliesEnabled {
                speechService.speak(response.text)
            }
        } catch {
            let text = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            let assistant = ChatMessage(role: .assistant, content: "⚠️ \(text)", modelId: routed.rawValue, isError: true)
            messages.append(assistant)
            errorBanner = text
            save()
            Haptics.warning()
        }
        isLoading = false
    }

    private func save() {
        storage.saveMessages(messages)
    }
}
