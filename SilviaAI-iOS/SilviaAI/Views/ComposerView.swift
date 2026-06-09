import SwiftUI

struct ComposerView: View {
    @Binding var text: String
    let canSend: Bool
    let isLoading: Bool
    let isListening: Bool
    let attachments: [ChatAttachment]
    let onTakePhoto: () -> Void
    let onUploadPhoto: () -> Void
    let onUploadFile: () -> Void
    let onRemoveAttachment: (ChatAttachment) -> Void
    let onSend: () -> Void
    let onMic: () -> Void

    @State private var pulse = false
    @State private var showingAttachmentMenu = false

    private let controlSize: CGFloat = 46

    var body: some View {
        VStack(spacing: 8) {
            if showingAttachmentMenu {
                attachmentPanel
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            if !attachments.isEmpty {
                attachmentTray
            }

            HStack(alignment: .center, spacing: 8) {
                attachmentButton
                micButton
                inputField
                sendButton
            }
        }
        .padding(.horizontal, 14)
        .padding(.top, 10)
        .padding(.bottom, 10)
        .background(.ultraThinMaterial)
        .overlay(Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1), alignment: .top)
        .animation(.spring(response: 0.30, dampingFraction: 0.88), value: showingAttachmentMenu)
        .onAppear {
            updateListeningPulse(isListening)
        }
        .onChange(of: isListening) { _, listening in
            updateListeningPulse(listening)
        }
    }

    private var attachmentButton: some View {
        Button {
            withAnimation(.spring(response: 0.28, dampingFraction: 0.86)) {
                showingAttachmentMenu.toggle()
            }
        } label: {
            circleControl(
                symbol: showingAttachmentMenu ? "xmark" : "plus",
                fill: showingAttachmentMenu ? AnyShapeStyle(Theme.accent) : AnyShapeStyle(Theme.panel),
                stroke: showingAttachmentMenu ? Color.cyan.opacity(0.64) : Theme.panelStroke,
                shadow: showingAttachmentMenu ? Color.cyan.opacity(0.24) : .clear
            )
        }
        .foregroundStyle(.white)
        .buttonStyle(.plain)
        .accessibilityLabel("Add attachment")
    }

    private var micButton: some View {
        Button(action: onMic) {
            ZStack {
                if isListening {
                    Circle()
                        .stroke(Color.cyan.opacity(0.55), lineWidth: 2)
                        .frame(width: controlSize + 8, height: controlSize + 8)
                        .scaleEffect(pulse ? 1.14 : 0.86)
                        .opacity(pulse ? 0.10 : 0.95)
                }
                circleControl(
                    symbol: isListening ? "waveform" : "mic.fill",
                    fill: isListening ? AnyShapeStyle(Theme.accent) : AnyShapeStyle(Theme.panel),
                    stroke: isListening ? Color.cyan.opacity(0.70) : Theme.panelStroke,
                    shadow: isListening ? Color.cyan.opacity(0.42) : .clear
                )
            }
            .frame(width: controlSize, height: controlSize)
        }
        .foregroundStyle(.white)
        .buttonStyle(.plain)
        .accessibilityLabel(isListening ? "Voice input active" : "Voice input")
    }

    private var inputField: some View {
        TextField(Constants.inputPlaceholder, text: $text, axis: .vertical)
            .lineLimit(1...5)
            .font(.body)
            .foregroundStyle(.white)
            .tint(.cyan)
            .padding(.horizontal, 14)
            .padding(.vertical, 11)
            .frame(minHeight: controlSize)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 23, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 23, style: .continuous).stroke(Theme.panelStroke))
            .submitLabel(.send)
            .onSubmit { if canSend { onSend() } }
    }

    private var sendButton: some View {
        Button(action: onSend) {
            ZStack {
                Circle().fill(canSend ? AnyShapeStyle(Theme.accent) : AnyShapeStyle(Color.white.opacity(0.12)))
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
            .frame(width: controlSize, height: controlSize)
            .overlay(Circle().stroke(canSend ? Color.white.opacity(0.08) : Theme.panelStroke, lineWidth: 1.5))
            .shadow(color: canSend ? Color.blue.opacity(0.35) : .clear, radius: 14, y: 7)
        }
        .disabled(!canSend)
        .buttonStyle(.plain)
        .accessibilityLabel("Send message")
    }

    private var attachmentPanel: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Add attachment")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.white.opacity(0.68))
                .padding(.horizontal, 2)
            attachmentMenuButton("Take photo", icon: "camera.fill", action: onTakePhoto)
            attachmentMenuButton("Upload photo", icon: "photo.fill.on.rectangle.fill", action: onUploadPhoto)
            attachmentMenuButton("Upload file", icon: "doc.fill.badge.plus", action: onUploadFile)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.black.opacity(0.20), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Theme.panelStroke))
        .shadow(color: Color.black.opacity(0.26), radius: 18, y: 8)
    }

    private func attachmentMenuButton(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button {
            withAnimation(.spring(response: 0.28, dampingFraction: 0.86)) {
                showingAttachmentMenu = false
            }
            action()
        } label: {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func circleControl(symbol: String, fill: AnyShapeStyle, stroke: Color, shadow: Color) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 18, weight: .bold))
            .frame(width: controlSize, height: controlSize)
            .background(fill, in: Circle())
            .overlay(Circle().stroke(stroke, lineWidth: 1.5))
            .shadow(color: shadow, radius: 14, y: 6)
    }

    private func updateListeningPulse(_ listening: Bool) {
        if listening {
            pulse = false
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                pulse = true
            }
        } else {
            withAnimation(.easeOut(duration: 0.18)) {
                pulse = false
            }
        }
    }

    private var attachmentTray: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(attachments) { attachment in
                    HStack(spacing: 7) {
                        Image(systemName: attachment.isImage ? "photo.fill" : "doc.fill")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Color.cyan)
                        Text(attachment.fileName)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Button {
                            onRemoveAttachment(attachment)
                        } label: {
                            Image(systemName: "xmark")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(Color.white.opacity(0.74))
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color.white.opacity(0.09), in: Capsule())
                    .overlay(Capsule().stroke(Color.white.opacity(0.10)))
                }
            }
            .padding(.horizontal, 2)
        }
    }
}
