import Foundation
import UIKit

@MainActor
final class ChatViewModel: ObservableObject {
    @Published private(set) var messages: [ChatMessage]
    @Published var draft = ""
    @Published private(set) var isLoading = false
    @Published var errorBanner: String?

    private let aiService: AIService
    private var storage: ChatStorageService
    private let settingsViewModel: SettingsViewModel
    private let speechService = SpeechService()
    private var lastUserMessage: ChatMessage?
    private var currentUserID: String?

    init(
        aiService: AIService = AIService(),
        storage: ChatStorageService? = nil,
        userID: String? = nil,
        settingsViewModel: SettingsViewModel
    ) {
        self.aiService = aiService
        self.storage = storage ?? ChatStorageService(userID: userID)
        self.settingsViewModel = settingsViewModel
        self.currentUserID = userID
        let stored = self.storage.loadMessages()
        self.messages = stored
        self.lastUserMessage = stored.last { $0.role == .user }
    }

    var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isLoading
    }

    func sendCurrentDraft() async {
        await sendCurrentDraft(attachments: [])
    }

    func sendCurrentDraft(attachments: [ChatAttachment]) async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (!text.isEmpty || !attachments.isEmpty), !isLoading else { return }
        draft = ""
        await send(text, attachments: attachments)
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

    func switchAccount(to userID: String?) {
        guard currentUserID != userID else { return }
        currentUserID = userID
        storage = ChatStorageService(userID: userID)
        messages = storage.loadMessages()
        lastUserMessage = messages.last { $0.role == .user }
        draft = ""
        errorBanner = nil
    }

    func copy(_ message: ChatMessage) {
        UIPasteboard.general.string = message.content
        Haptics.success()
    }

    private func send(_ text: String, attachments: [ChatAttachment]) async {
        let content = text.isEmpty ? attachmentSummary(attachments) : text
        let userMessage = ChatMessage(role: .user, content: content, attachments: attachments)
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
        let routed = aiService.routedModel(for: userMessage.content, attachments: userMessage.attachments, messages: messages, selected: selected)
        do {
            let response = try await aiService.generateReply(messages: messages, settings: settingsViewModel.settings)
            let assistant = ChatMessage(
                role: .assistant,
                content: response.text,
                modelId: response.modelID.rawValue,
                imageData: response.imageData,
                imagePrompt: response.imagePrompt
            )
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

    private func attachmentSummary(_ attachments: [ChatAttachment]) -> String {
        if attachments.count == 1, let first = attachments.first {
            return "Uploaded \(first.fileName)"
        }
        return "Uploaded \(attachments.count) attachments"
    }
}
