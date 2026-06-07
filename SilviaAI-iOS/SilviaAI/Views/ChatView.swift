import SwiftUI

struct ChatView: View {
    @StateObject var chatViewModel: ChatViewModel
    @StateObject var settingsViewModel: SettingsViewModel
    @StateObject private var speechService = SpeechService()
    @State private var showingSettings = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                aurora
                VStack(spacing: 0) {
                    header
                    messageList
                    ComposerView(
                        text: $chatViewModel.draft,
                        canSend: chatViewModel.canSend,
                        isLoading: chatViewModel.isLoading,
                        onSend: { Task { await chatViewModel.sendCurrentDraft() } },
                        onMic: { toggleVoiceInput() }
                    )
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingSettings) {
                SettingsView(settingsViewModel: settingsViewModel) {
                    chatViewModel.clearChat()
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
            .onChange(of: speechService.transcript) { _, newValue in
                if settingsViewModel.settings.voiceInputEnabled {
                    chatViewModel.draft = newValue
                }
            }
        }
    }

    private var header: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(Theme.accent).frame(width: 44, height: 44).shadow(color: .blue.opacity(0.55), radius: 18)
                Image(systemName: "sparkles").foregroundStyle(.white).font(.system(size: 18, weight: .bold))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(Constants.appName)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                HStack(spacing: 6) {
                    Circle().fill(.green).frame(width: 7, height: 7)
                    Text(Constants.onlineStatus)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Theme.subtleText)
                }
            }
            Spacer()
            Menu {
                Picker("Model", selection: $settingsViewModel.settings.selectedModel) {
                    ForEach(AIModel.all) { model in
                        Text(model.displayName).tag(model.id)
                    }
                }
                Button("Regenerate Response", systemImage: "arrow.clockwise") {
                    Task { await chatViewModel.regenerateLastResponse() }
                }
                Button("Clear Chat", systemImage: "trash", role: .destructive) {
                    chatViewModel.clearChat()
                }
            } label: {
                HStack(spacing: 7) {
                    Image(systemName: "cpu")
                    Text(AIModel.model(for: settingsViewModel.settings.selectedModel).shortName)
                }
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(.ultraThinMaterial, in: Capsule())
                .overlay(Capsule().stroke(Theme.panelStroke))
            }
            Button { showingSettings = true } label: {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .frame(width: 40, height: 40)
                    .background(.ultraThinMaterial, in: Circle())
                    .overlay(Circle().stroke(Theme.panelStroke))
            }
            .foregroundStyle(.white)
            .accessibilityLabel("Settings")
        }
        .padding(.horizontal, 18)
        .padding(.top, 10)
        .padding(.bottom, 12)
        .background(.ultraThinMaterial)
        .overlay(Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1), alignment: .bottom)
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 18) {
                    if chatViewModel.messages.isEmpty {
                        Spacer(minLength: 60)
                        WelcomeView { suggestion in
                            chatViewModel.sendSuggestion(suggestion)
                        }
                    } else {
                        ForEach(chatViewModel.messages) { message in
                            MessageBubbleView(message: message) {
                                chatViewModel.copy(message)
                            }
                            .id(message.id)
                        }
                    }
                    if chatViewModel.isLoading {
                        TypingIndicatorView().id("typing")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 22)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: chatViewModel.messages.count) { _, _ in scrollToBottom(proxy) }
            .onChange(of: chatViewModel.isLoading) { _, _ in scrollToBottom(proxy) }
        }
    }

    private var aurora: some View {
        ZStack {
            Circle().fill(Color.purple.opacity(0.24)).frame(width: 260, height: 260).blur(radius: 60).offset(x: -150, y: -260)
            Circle().fill(Color.cyan.opacity(0.20)).frame(width: 240, height: 240).blur(radius: 70).offset(x: 150, y: 150)
            Circle().fill(Color.indigo.opacity(0.16)).frame(width: 320, height: 320).blur(radius: 90).offset(x: 110, y: -120)
        }
        .ignoresSafeArea()
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.88)) {
            if chatViewModel.isLoading {
                proxy.scrollTo("typing", anchor: .bottom)
            } else if let last = chatViewModel.messages.last {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }

    private func toggleVoiceInput() {
        settingsViewModel.settings.voiceInputEnabled = true
        if speechService.isListening {
            speechService.stopListening()
        } else {
            Task { try? await speechService.startListening() }
        }
    }
}

private struct TypingIndicatorView: View {
    @State private var phase = 0

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle().fill(Theme.accent).frame(width: 30, height: 30)
                Image(systemName: "sparkles").font(.caption.bold()).foregroundStyle(.white)
            }
            HStack(spacing: 5) {
                ForEach(0..<3) { index in
                    Circle()
                        .fill(Color.white.opacity(0.75))
                        .frame(width: 7, height: 7)
                        .scaleEffect(phase == index ? 1.22 : 0.75)
                        .opacity(phase == index ? 1 : 0.45)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(.ultraThinMaterial, in: Capsule())
            Spacer()
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(280))
                withAnimation(.easeInOut(duration: 0.24)) { phase = (phase + 1) % 3 }
            }
        }
    }
}
