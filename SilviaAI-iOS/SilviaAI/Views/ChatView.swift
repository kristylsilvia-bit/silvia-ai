import AVFoundation
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers
import UIKit

struct ChatView: View {
    @StateObject var chatViewModel: ChatViewModel
    @StateObject var settingsViewModel: SettingsViewModel
    @ObservedObject var authViewModel: AuthViewModel
    @StateObject private var speechService = SpeechService()
    @State private var showingSettings = false
    @State private var showingAuth = false
    @State private var pendingAttachments: [ChatAttachment] = []
    @State private var showingPhotoPicker = false
    @State private var selectedPhotoItems: [PhotosPickerItem] = []
    @State private var showingFileImporter = false
    @State private var showingCamera = false
    @State private var attachmentAlert: String?
    @State private var showingAttachmentAlert = false
    @AppStorage(Constants.guestModeStorageKey) private var acceptedGuestMode = false

    private let bottomSpacerID = "chat-bottom-spacer"

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                aurora
                VStack(spacing: 0) {
                    header
                    messageList
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                composer
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingSettings) {
                SettingsView(settingsViewModel: settingsViewModel, authViewModel: authViewModel) {
                    chatViewModel.clearChat()
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
            .fullScreenCover(isPresented: $showingAuth) {
                AuthScreenView(authViewModel: authViewModel, allowsGuest: true) {
                    acceptedGuestMode = true
                }
            }
            .photosPicker(isPresented: $showingPhotoPicker, selection: $selectedPhotoItems, matching: .images)
            .fileImporter(
                isPresented: $showingFileImporter,
                allowedContentTypes: [.image, .pdf, .plainText, .rtf, .json, .commaSeparatedText, .data],
                allowsMultipleSelection: true
            ) { result in
                handleImportedFiles(result)
            }
            .sheet(isPresented: $showingCamera) {
                CameraCaptureView { image in
                    addCameraImage(image)
                }
                .ignoresSafeArea()
            }
            .alert("Attachment unavailable", isPresented: $showingAttachmentAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(attachmentAlert ?? "Try again in a moment.")
            }
            .onChange(of: speechService.transcript) { _, newValue in
                if settingsViewModel.settings.voiceInputEnabled {
                    chatViewModel.draft = newValue
                }
            }
            .onChange(of: selectedPhotoItems) { _, items in
                guard !items.isEmpty else { return }
                Task {
                    await loadPhotoItems(items)
                    selectedPhotoItems = []
                }
            }
            .onAppear {
                if authViewModel.user == nil && !acceptedGuestMode {
                    showingAuth = true
                }
            }
            .onChange(of: authViewModel.user?.uid) { _, uid in
                chatViewModel.switchAccount(to: uid)
                if uid != nil {
                    acceptedGuestMode = false
                    showingAuth = false
                }
            }
        }
    }

    private var composerCanSend: Bool {
        (!chatViewModel.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !pendingAttachments.isEmpty)
        && !chatViewModel.isLoading
    }

    private var composer: some View {
        ComposerView(
            text: $chatViewModel.draft,
            canSend: composerCanSend,
            isLoading: chatViewModel.isLoading,
            isListening: speechService.isListening,
            attachments: pendingAttachments,
            onTakePhoto: { requestCameraAccess() },
            onUploadPhoto: { showingPhotoPicker = true },
            onUploadFile: { showingFileImporter = true },
            onRemoveAttachment: { attachment in
                pendingAttachments.removeAll { $0.id == attachment.id }
            },
            onSend: { sendComposerMessage() },
            onMic: { toggleVoiceInput() }
        )
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
                    Color.clear.frame(height: 34).id(bottomSpacerID)
                }
                .padding(.horizontal, 16)
                .padding(.top, 22)
                .padding(.bottom, 8)
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
            proxy.scrollTo(bottomSpacerID, anchor: .bottom)
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

    private func sendComposerMessage() {
        let attachments = pendingAttachments
        pendingAttachments = []
        Task {
            await chatViewModel.sendCurrentDraft(attachments: attachments)
        }
    }

    private func requestCameraAccess() {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            showAttachmentAlert("This device does not have an available camera.")
            return
        }

        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            showingCamera = true
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                Task { @MainActor in
                    if granted {
                        showingCamera = true
                    } else {
                        showAttachmentAlert("Camera access is needed to take a photo.")
                    }
                }
            }
        case .denied, .restricted:
            showAttachmentAlert("Camera access is needed to take a photo.")
        @unknown default:
            showAttachmentAlert("Camera access is unavailable right now.")
        }
    }

    private func addCameraImage(_ image: UIImage) {
        guard let data = image.jpegData(compressionQuality: 0.88) else {
            showAttachmentAlert("Could not prepare that photo.")
            return
        }
        pendingAttachments.append(
            ChatAttachment(
                fileName: "Camera Photo.jpg",
                mimeType: "image/jpeg",
                data: data,
                kind: .image
            )
        )
    }

    private func loadPhotoItems(_ items: [PhotosPickerItem]) async {
        for item in items {
            do {
                guard let data = try await item.loadTransferable(type: Data.self) else { continue }
                let contentType = item.supportedContentTypes.first
                let mimeType = contentType?.preferredMIMEType ?? "image/jpeg"
                let fileExtension = contentType?.preferredFilenameExtension ?? "jpg"
                pendingAttachments.append(
                    ChatAttachment(
                        fileName: "Photo \(pendingAttachments.count + 1).\(fileExtension)",
                        mimeType: mimeType,
                        data: data,
                        kind: .image
                    )
                )
            } catch {
                showAttachmentAlert(error.localizedDescription)
            }
        }
    }

    private func handleImportedFiles(_ result: Result<[URL], Error>) {
        do {
            let urls = try result.get()
            for url in urls {
                let isScoped = url.startAccessingSecurityScopedResource()
                defer {
                    if isScoped { url.stopAccessingSecurityScopedResource() }
                }
                let data = try Data(contentsOf: url)
                let type = UTType(filenameExtension: url.pathExtension)
                let mimeType = type?.preferredMIMEType ?? "application/octet-stream"
                pendingAttachments.append(
                    ChatAttachment(
                        fileName: url.lastPathComponent,
                        mimeType: mimeType,
                        data: data,
                        kind: mimeType.hasPrefix("image/") ? .image : .file
                    )
                )
            }
        } catch {
            showAttachmentAlert(error.localizedDescription)
        }
    }

    private func showAttachmentAlert(_ message: String) {
        attachmentAlert = message
        showingAttachmentAlert = true
    }
}

private struct CameraCaptureView: UIViewControllerRepresentable {
    let onImage: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onImage: onImage, dismiss: dismiss)
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onImage: (UIImage) -> Void
        let dismiss: DismissAction

        init(onImage: @escaping (UIImage) -> Void, dismiss: DismissAction) {
            self.onImage = onImage
            self.dismiss = dismiss
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let image = info[.originalImage] as? UIImage {
                onImage(image)
            }
            dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            dismiss()
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
