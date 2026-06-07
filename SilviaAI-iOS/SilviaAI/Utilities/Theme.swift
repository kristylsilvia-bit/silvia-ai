import SwiftUI

enum Theme {
    static let background = LinearGradient(
        colors: [Color(red: 0.015, green: 0.018, blue: 0.035), Color(red: 0.025, green: 0.035, blue: 0.085), Color.black],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let accent = LinearGradient(
        colors: [Color(red: 0.48, green: 0.32, blue: 1.0), Color(red: 0.12, green: 0.62, blue: 1.0)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let warmAccent = LinearGradient(
        colors: [Color(red: 1.0, green: 0.48, blue: 0.38), Color(red: 1.0, green: 0.77, blue: 0.24)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let panel = Color.white.opacity(0.08)
    static let panelStroke = Color.white.opacity(0.14)
    static let subtleText = Color.white.opacity(0.64)
    static let userBubble = Color(red: 0.22, green: 0.27, blue: 0.98)
    static let assistantBubble = Color.white.opacity(0.095)
    static let error = Color(red: 1.0, green: 0.34, blue: 0.42)

    static let bubbleRadius: CGFloat = 24
    static let cardRadius: CGFloat = 28
}
