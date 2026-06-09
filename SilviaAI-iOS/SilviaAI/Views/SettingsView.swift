import SwiftUI

struct SettingsView: View {
    @ObservedObject var settingsViewModel: SettingsViewModel
    @ObservedObject var authViewModel: AuthViewModel
    let onClearChats: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var showingAuth = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                Form {
                    Section("Account") {
                        AccountSettingsCard(user: authViewModel.user) {
                            showingAuth = true
                        } onSignOut: {
                            authViewModel.signOut()
                        }
                        .listRowInsets(EdgeInsets(top: 10, leading: 14, bottom: 10, trailing: 14))
                        .listRowBackground(Color.clear)
                    }

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
            .sheet(isPresented: $showingAuth) {
                AuthScreenView(authViewModel: authViewModel, allowsGuest: false) {}
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

private struct AccountSettingsCard: View {
    let user: AuthUser?
    let onSignIn: () -> Void
    let onSignOut: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 13) {
                avatar
                VStack(alignment: .leading, spacing: 4) {
                    Text(user?.displayLabel ?? "Guest mode")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(user?.email ?? "Sign in to keep chats tied to your account.")
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.66))
                        .lineLimit(2)
                    if let user {
                        Label(user.providerLabel, systemImage: user.provider == "google.com" ? "checkmark.seal.fill" : "envelope.fill")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Color.cyan)
                    }
                }
                Spacer(minLength: 0)
            }

            Button {
                user == nil ? onSignIn() : onSignOut()
            } label: {
                Label(user == nil ? "Sign in or create account" : "Sign out", systemImage: user == nil ? "person.crop.circle.badge.plus" : "rectangle.portrait.and.arrow.right")
                    .font(.subheadline.weight(.bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(user == nil ? AnyShapeStyle(Theme.accent) : AnyShapeStyle(Color.white.opacity(0.10)), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .foregroundStyle(.white)
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [Color.white.opacity(0.13), Color.cyan.opacity(0.08), Color.purple.opacity(0.09)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 24, style: .continuous)
        )
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).stroke(Color.white.opacity(0.14)))
    }

    private var avatar: some View {
        ZStack {
            Circle().fill(Theme.accent)
            if let url = user?.photoURL {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        avatarInitial
                    }
                }
                .clipShape(Circle())
            } else {
                avatarInitial
            }
        }
        .frame(width: 58, height: 58)
        .shadow(color: Color.blue.opacity(0.28), radius: 16, y: 8)
    }

    private var avatarInitial: some View {
        Text(String((user?.displayLabel ?? "S").prefix(1)).uppercased())
            .font(.system(size: 24, weight: .black, design: .rounded))
            .foregroundStyle(.white)
    }
}
