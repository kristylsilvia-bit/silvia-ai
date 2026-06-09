import SwiftUI
import Photos
import UIKit

struct MessageBubbleView: View {
    let message: ChatMessage
    let onCopy: () -> Void

    @State private var previewImage: ImagePreviewItem?

    private var isUser: Bool { message.role == .user }

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            if isUser { Spacer(minLength: 42) }
            if !isUser { avatar }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 8) {
                content
                    .padding(.horizontal, 16)
                    .padding(.vertical, 13)
                    .background(bubbleBackground)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.bubbleRadius, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.bubbleRadius, style: .continuous)
                            .stroke(isUser ? Color.white.opacity(0.12) : Theme.panelStroke, lineWidth: 1)
                    )
                    .shadow(color: isUser ? Color.blue.opacity(0.28) : Color.black.opacity(0.24), radius: 18, x: 0, y: 10)

                HStack(spacing: 10) {
                    Text(message.createdAt, style: .time)
                        .font(.caption2)
                        .foregroundStyle(Theme.subtleText)
                    Button(action: onCopy) {
                        Label("Copy", systemImage: "doc.on.doc")
                            .labelStyle(.iconOnly)
                            .font(.caption)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Theme.subtleText)
                    .accessibilityLabel("Copy message")
                }
                .padding(.horizontal, 6)
            }

            if !isUser { Spacer(minLength: 42) }
        }
        .transition(.move(edge: isUser ? .trailing : .leading).combined(with: .opacity))
        .fullScreenCover(item: $previewImage) { item in
            ImagePreviewView(item: item)
        }
    }

    @ViewBuilder
    private var content: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let data = message.imageData, let uiImage = UIImage(data: data) {
                Button {
                    previewImage = ImagePreviewItem(image: uiImage, title: "Generated image")
                } label: {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(alignment: .topTrailing) {
                            Image(systemName: "arrow.up.left.and.arrow.down.right")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.white)
                                .padding(8)
                                .background(Color.black.opacity(0.42), in: Circle())
                                .padding(8)
                        }
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Open generated image")
            }
            if !message.attachments.isEmpty {
                ForEach(message.attachments) { attachment in
                    AttachmentPreviewView(attachment: attachment) { image in
                        previewImage = ImagePreviewItem(image: image, title: attachment.fileName)
                    }
                }
            }
            if message.isError {
                Text(message.content)
                    .font(.body)
                    .foregroundStyle(.white)
                    .textSelection(.enabled)
            } else {
                MarkdownLiteView(text: message.content, isUser: isUser)
            }
        }
    }

    private var bubbleBackground: some ShapeStyle {
        if isUser { return AnyShapeStyle(Theme.accent) }
        if message.isError { return AnyShapeStyle(Theme.error.opacity(0.82)) }
        return AnyShapeStyle(.ultraThinMaterial)
    }

    private var avatar: some View {
        ZStack {
            Circle()
                .fill(Theme.accent)
                .frame(width: 30, height: 30)
                .shadow(color: Color.blue.opacity(0.55), radius: 14)
            Image(systemName: "sparkles")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
        }
    }
}

private struct AttachmentPreviewView: View {
    let attachment: ChatAttachment
    let onOpenImage: (UIImage) -> Void

    var body: some View {
        if attachment.isImage, let uiImage = UIImage(data: attachment.data) {
            Button {
                onOpenImage(uiImage)
            } label: {
                HStack(spacing: 10) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 58, height: 58)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    VStack(alignment: .leading, spacing: 3) {
                        Text(attachment.fileName)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text("Image")
                            .font(.caption2)
                            .foregroundStyle(Color.white.opacity(0.62))
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.white.opacity(0.78))
                }
                .padding(10)
                .background(Color.black.opacity(0.20), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.white.opacity(0.10)))
            }
            .buttonStyle(.plain)
        } else {
            HStack(spacing: 10) {
                Image(systemName: "doc.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(Color.cyan)
                    .frame(width: 36, height: 36)
                    .background(Color.cyan.opacity(0.14), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(attachment.fileName)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(attachment.mimeType)
                        .font(.caption2)
                        .foregroundStyle(Color.white.opacity(0.62))
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            .padding(10)
            .background(Color.black.opacity(0.20), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.white.opacity(0.10)))
        }
    }
}

private struct ImagePreviewItem: Identifiable {
    let id = UUID()
    let image: UIImage
    let title: String
}

private struct ImagePreviewView: View {
    let item: ImagePreviewItem

    @Environment(\.dismiss) private var dismiss
    @State private var showingShare = false
    @State private var statusMessage: String?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            Image(uiImage: item.image)
                .resizable()
                .scaledToFit()
                .padding(.horizontal, 14)
                .padding(.vertical, 96)

            VStack {
                HStack(spacing: 12) {
                    Text(item.title)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 15, weight: .bold))
                            .frame(width: 38, height: 38)
                            .background(Color.white.opacity(0.14), in: Circle())
                    }
                    .foregroundStyle(.white)
                    .accessibilityLabel("Close image")
                }
                .padding(.horizontal, 18)
                .padding(.top, 18)

                Spacer()

                if let statusMessage {
                    Text(statusMessage)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.14), in: Capsule())
                        .padding(.bottom, 12)
                }

                HStack(spacing: 12) {
                    Button {
                        showingShare = true
                    } label: {
                        Label("Share", systemImage: "square.and.arrow.up")
                            .imagePreviewActionStyle()
                    }

                    Button {
                        saveToPhotos()
                    } label: {
                        Label("Save to Photos", systemImage: "square.and.arrow.down")
                            .imagePreviewActionStyle()
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 26)
            }
        }
        .sheet(isPresented: $showingShare) {
            ShareSheet(items: [item.image])
        }
    }

    private func saveToPhotos() {
        statusMessage = nil
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                Task { @MainActor in statusMessage = "Photos access is needed to save." }
                return
            }

            PHPhotoLibrary.shared().performChanges {
                PHAssetChangeRequest.creationRequestForAsset(from: item.image)
            } completionHandler: { success, error in
                Task { @MainActor in
                    statusMessage = success ? "Saved to Photos." : (error?.localizedDescription ?? "Could not save image.")
                }
            }
        }
    }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

private extension View {
    func imagePreviewActionStyle() -> some View {
        self
            .font(.callout.weight(.bold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.white.opacity(0.16)))
    }
}

private struct MarkdownLiteView: View {
    let text: String
    let isUser: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(parseSegments(), id: \.id) { segment in
                if segment.isCode {
                    CodeBlockView(code: segment.content)
                } else {
                    markdownText(segment.content)
                        .font(.body)
                        .foregroundStyle(isUser ? Color.white : Color.white.opacity(0.92))
                        .textSelection(.enabled)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func markdownText(_ value: String) -> Text {
        if let attributed = try? AttributedString(markdown: value, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            return Text(attributed)
        }
        return Text(value)
    }

    private func parseSegments() -> [Segment] {
        let parts = text.components(separatedBy: "```")
        guard parts.count > 1 else { return [Segment(content: text, isCode: false)] }
        return parts.enumerated().map { index, value in
            var content = value
            if index % 2 == 1, let newline = value.firstIndex(of: "\n") {
                content = String(value[value.index(after: newline)...])
            }
            return Segment(content: content.trimmingCharacters(in: .newlines), isCode: index % 2 == 1)
        }.filter { !$0.content.isEmpty }
    }

    private struct Segment: Identifiable {
        let id = UUID()
        let content: String
        let isCode: Bool
    }
}

private struct CodeBlockView: View {
    let code: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("Code", systemImage: "chevron.left.forwardslash.chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.64))
                Spacer()
                Button {
                    UIPasteboard.general.string = code
                    Haptics.success()
                } label: {
                    Image(systemName: "doc.on.doc")
                }
                .buttonStyle(.plain)
                .foregroundStyle(Color.white.opacity(0.72))
            }
            ScrollView(.horizontal, showsIndicators: false) {
                Text(code)
                    .font(.system(.footnote, design: .monospaced))
                    .foregroundStyle(Color(red: 0.80, green: 0.88, blue: 1.0))
                    .textSelection(.enabled)
                    .padding(.bottom, 2)
            }
        }
        .padding(12)
        .background(Color.black.opacity(0.34))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.white.opacity(0.10)))
    }
}
