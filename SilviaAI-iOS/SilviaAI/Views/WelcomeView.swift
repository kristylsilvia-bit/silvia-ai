import SwiftUI

struct WelcomeView: View {
    let onPickSuggestion: (String) -> Void

    private let suggestions = [
        "Draft a launch plan for Silvia AI",
        "Explain this Swift code like I'm new to iOS",
        "Write a premium product description",
        "Help me debug a Gemini API error"
    ]

    var body: some View {
        VStack(spacing: 22) {
            ZStack {
                Circle()
                    .fill(Theme.accent)
                    .frame(width: 82, height: 82)
                    .blur(radius: 16)
                    .opacity(0.65)
                Circle()
                    .fill(Theme.accent)
                    .frame(width: 74, height: 74)
                    .overlay(Circle().stroke(Color.white.opacity(0.22), lineWidth: 1))
                Image(systemName: "sparkles")
                    .font(.system(size: 31, weight: .bold))
                    .foregroundStyle(.white)
            }
            VStack(spacing: 8) {
                Text("Welcome to Silvia AI")
                    .font(.system(size: 31, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text("A fast, polished Gemini chat studio for ideas, code, writing, and deep reasoning.")
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.subtleText)
                    .padding(.horizontal)
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(suggestions, id: \.self) { suggestion in
                    Button { onPickSuggestion(suggestion) } label: {
                        Text(suggestion)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.92))
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, minHeight: 74, alignment: .topLeading)
                            .padding(14)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(Theme.panelStroke))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(22)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous).stroke(Theme.panelStroke))
        .padding(.horizontal, 18)
    }
}
