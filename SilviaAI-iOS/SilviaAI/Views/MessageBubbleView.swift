import SwiftUI
import UIKit

struct MessageBubbleView: View {
    let message: ChatMessage
    let onCopy: () -> Void

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
    }

    @ViewBuilder
    private var content: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let data = message.imageData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFit()
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .accessibilityLabel("Generated image")
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
