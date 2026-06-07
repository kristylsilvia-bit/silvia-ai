import SwiftUI

struct ComposerView: View {
    @Binding var text: String
    let canSend: Bool
    let isLoading: Bool
    let onSend: () -> Void
    let onMic: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            Button(action: onMic) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .frame(width: 42, height: 42)
                    .background(Theme.panel, in: Circle())
                    .overlay(Circle().stroke(Theme.panelStroke, lineWidth: 1))
            }
            .foregroundStyle(.white.opacity(0.82))
            .accessibilityLabel("Voice input")

            TextField(Constants.inputPlaceholder, text: $text, axis: .vertical)
                .lineLimit(1...6)
                .font(.body)
                .foregroundStyle(.white)
                .tint(.cyan)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).stroke(Theme.panelStroke))
                .submitLabel(.send)
                .onSubmit { if canSend { onSend() } }

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
                .frame(width: 46, height: 46)
                .shadow(color: canSend ? Color.blue.opacity(0.35) : .clear, radius: 16, y: 8)
            }
            .disabled(!canSend)
            .accessibilityLabel("Send message")
        }
        .padding(.horizontal, 18)
        .padding(.top, 12)
        .padding(.bottom, 12)
        .background(.ultraThinMaterial)
        .overlay(Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1), alignment: .top)
    }
}
