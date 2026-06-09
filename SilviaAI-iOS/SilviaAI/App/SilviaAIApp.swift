import SwiftUI

@main
struct SilviaAIApp: App {
    @StateObject private var settingsViewModel = SettingsViewModel()
    @StateObject private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            ChatView(
                chatViewModel: ChatViewModel(userID: authViewModel.user?.uid, settingsViewModel: settingsViewModel),
                settingsViewModel: settingsViewModel,
                authViewModel: authViewModel
            )
            .preferredColorScheme(.dark)
        }
    }
}
