import SwiftUI

@main
struct SilviaAIApp: App {
    @StateObject private var settingsViewModel = SettingsViewModel()

    var body: some Scene {
        WindowGroup {
            ChatView(
                chatViewModel: ChatViewModel(settingsViewModel: settingsViewModel),
                settingsViewModel: settingsViewModel
            )
            .preferredColorScheme(.dark)
        }
    }
}
