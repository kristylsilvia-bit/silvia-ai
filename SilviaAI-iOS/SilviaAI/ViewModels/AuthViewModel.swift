import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published private(set) var user: AuthUser?
    @Published private(set) var isBusy = false
    @Published var errorMessage: String?
    @Published var infoMessage: String?

    private let service: FirebaseAuthService
    private let googleOAuthService: GoogleOAuthService

    init(
        service: FirebaseAuthService = FirebaseAuthService(),
        googleOAuthService: GoogleOAuthService? = nil
    ) {
        self.service = service
        self.googleOAuthService = googleOAuthService ?? GoogleOAuthService()
        self.user = Self.loadUser()
    }

    var isSignedIn: Bool {
        user != nil
    }

    func signIn(email: String, password: String) async {
        await authenticate {
            try await service.signIn(email: email, password: password)
        }
    }

    func signUp(email: String, password: String) async {
        await authenticate {
            try await service.signUp(email: email, password: password)
        }
    }

    func sendPasswordReset(email: String) async {
        guard validateEmail(email) else { return }
        isBusy = true
        errorMessage = nil
        infoMessage = nil
        do {
            try await service.sendPasswordReset(email: email.trimmingCharacters(in: .whitespacesAndNewlines))
            infoMessage = "Password reset email sent."
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        isBusy = false
    }

    func signInWithGoogle() async {
        isBusy = true
        errorMessage = nil
        infoMessage = nil
        do {
            let googleToken = try await googleOAuthService.signIn()
            let nextUser = try await service.signInWithGoogleIDToken(googleToken.idToken)
            user = nextUser
            Self.save(nextUser)
            Haptics.success()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            Haptics.warning()
        }
        isBusy = false
    }

    func signOut() {
        user = nil
        errorMessage = nil
        infoMessage = nil
        UserDefaults.standard.removeObject(forKey: Constants.authUserStorageKey)
        Haptics.success()
    }

    func clearMessages() {
        errorMessage = nil
        infoMessage = nil
    }

    private func authenticate(_ action: () async throws -> AuthUser) async {
        isBusy = true
        errorMessage = nil
        infoMessage = nil
        do {
            let nextUser = try await action()
            user = nextUser
            Self.save(nextUser)
            Haptics.success()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            Haptics.warning()
        }
        isBusy = false
    }

    private func validateEmail(_ email: String) -> Bool {
        guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Enter your email."
            return false
        }
        return true
    }

    private static func loadUser() -> AuthUser? {
        guard let data = UserDefaults.standard.data(forKey: Constants.authUserStorageKey) else {
            return nil
        }
        return try? JSONDecoder().decode(AuthUser.self, from: data)
    }

    private static func save(_ user: AuthUser) {
        guard let data = try? JSONEncoder().encode(user) else { return }
        UserDefaults.standard.set(data, forKey: Constants.authUserStorageKey)
    }
}
