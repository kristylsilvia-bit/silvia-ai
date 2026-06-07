import SwiftUI

struct SettingsView: View {
    @ObservedObject var settingsViewModel: SettingsViewModel
    let onClearChats: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                Form {
                    Section("Gemini Model") {
                        Picker("Default model", selection: $settingsViewModel.settings.selectedModel) {
                            ForEach(AIModel.all) { model in
                                VStack(alignment: .leading) {
                                    Text(model.displayName)
                                    Text(model.description)
                                }
                                .tag(model.id)
                            }
                        }
                        Text(AIModel.model(for: settingsViewModel.settings.selectedModel).description)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Section("Silvia Personality") {
                        TextEditor(text: $settingsViewModel.settings.systemPrompt)
                            .frame(minHeight: 140)
                            .font(.callout)
                        Button("Restore default personality") {
                            settingsViewModel.resetPersonality()
                        }
                    }

                    Section("Voice") {
                        Toggle("Voice input", isOn: $settingsViewModel.settings.voiceInputEnabled)
                        Toggle("Speak Silvia replies", isOn: $settingsViewModel.settings.spokenRepliesEnabled)
                    }

                    Section("Privacy & Storage") {
                        Text("Chats are stored locally on this iPhone using Codable file storage. API keys stay in Config.plist and are never written to chat history.")
                            .font(.caption)
                        Button("Clear saved chats", role: .destructive) {
                            onClearChats()
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
