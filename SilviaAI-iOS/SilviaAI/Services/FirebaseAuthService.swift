import AuthenticationServices
import CryptoKit
import Foundation
import UIKit

enum FirebaseAuthError: LocalizedError {
    case missingAPIKey
    case invalidURL
    case invalidResponse
    case api(String)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "Add your Firebase web API key in SilviaAI/Resources/Config.plist before signing in."
        case .invalidURL:
            return "Silvia could not build the Firebase Auth request URL."
        case .invalidResponse:
            return "Firebase returned an unexpected auth response."
        case .api(let code):
            return Self.friendlyMessage(for: code)
        case .transport(let error):
            return "Network problem: \(error.localizedDescription)"
        }
    }

    private static func friendlyMessage(for code: String) -> String {
        switch code {
        case "EMAIL_EXISTS":
            return "An account with this email already exists."
        case "EMAIL_NOT_FOUND", "INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS":
            return "Incorrect email or password."
        case "INVALID_EMAIL":
            return "Enter a valid email address."
        case "MISSING_PASSWORD":
            return "Enter your password."
        case "WEAK_PASSWORD":
            return "Password must be at least 6 characters."
        case "USER_DISABLED":
            return "This account has been disabled."
        case "OPERATION_NOT_ALLOWED":
            return "Email/password sign-in is not enabled for this Firebase project."
        case "TOO_MANY_ATTEMPTS_TRY_LATER":
            return "Too many attempts. Try again later."
        case "API_KEY_INVALID", "INVALID_API_KEY":
            return "Invalid Firebase API key. Check SilviaAI/Resources/Config.plist."
        default:
            return code.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}

final class FirebaseAuthService {
    private let session: URLSession
    private let baseURL = URL(string: "https://identitytoolkit.googleapis.com/v1")!

    init(session: URLSession = .shared) {
        self.session = session
    }

    func signIn(email: String, password: String) async throws -> AuthUser {
        let response: AuthResponse = try await post(
            path: "accounts:signInWithPassword",
            body: PasswordAuthRequest(email: email, password: password, returnSecureToken: true)
        )
        return response.user
    }

    func signUp(email: String, password: String) async throws -> AuthUser {
        let response: AuthResponse = try await post(
            path: "accounts:signUp",
            body: PasswordAuthRequest(email: email, password: password, returnSecureToken: true)
        )
        return response.user
    }

    func sendPasswordReset(email: String) async throws {
        let _: PasswordResetResponse = try await post(
            path: "accounts:sendOobCode",
            body: PasswordResetRequest(requestType: "PASSWORD_RESET", email: email)
        )
    }

    func signInWithGoogleIDToken(_ idToken: String) async throws -> AuthUser {
        let escapedToken = idToken.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? idToken
        let response: AuthResponse = try await post(
            path: "accounts:signInWithIdp",
            body: FederatedAuthRequest(
                postBody: "id_token=\(escapedToken)&providerId=google.com",
                requestUri: "http://localhost",
                returnIdpCredential: true,
                returnSecureToken: true
            )
        )
        return response.user
    }

    private func post<Request: Encodable, Response: Decodable>(
        path: String,
        body: Request
    ) async throws -> Response {
        guard let apiKey = Self.firebaseAPIKey,
              !apiKey.isEmpty,
              apiKey != "PASTE_YOUR_FIREBASE_WEB_API_KEY_HERE"
        else {
            throw FirebaseAuthError.missingAPIKey
        }

        guard var components = URLComponents(
            url: baseURL.appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        ) else {
            throw FirebaseAuthError.invalidURL
        }
        components.queryItems = [URLQueryItem(name: "key", value: apiKey)]
        guard let url = components.url else { throw FirebaseAuthError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 45
        request.httpBody = try JSONEncoder().encode(body)

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw FirebaseAuthError.invalidResponse
            }
            guard (200..<300).contains(http.statusCode) else {
                throw FirebaseAuthError.api(Self.parseErrorCode(from: data))
            }
            return try JSONDecoder().decode(Response.self, from: data)
        } catch let error as FirebaseAuthError {
            throw error
        } catch let error as DecodingError {
            throw FirebaseAuthError.api(error.localizedDescription)
        } catch {
            throw FirebaseAuthError.transport(error)
        }
    }

    private static func parseErrorCode(from data: Data) -> String {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let error = object["error"] as? [String: Any],
            let message = error["message"] as? String
        else { return String(data: data, encoding: .utf8) ?? "Firebase auth failed." }
        return message
    }

    private static var firebaseAPIKey: String? {
        guard let url = Bundle.main.url(forResource: Constants.configFileName, withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil),
              let dictionary = plist as? [String: Any]
        else { return nil }
        return dictionary["FIREBASE_API_KEY"] as? String
    }
}

private struct PasswordAuthRequest: Encodable {
    let email: String
    let password: String
    let returnSecureToken: Bool
}

private struct PasswordResetRequest: Encodable {
    let requestType: String
    let email: String
}

private struct FederatedAuthRequest: Encodable {
    let postBody: String
    let requestUri: String
    let returnIdpCredential: Bool
    let returnSecureToken: Bool
}

private struct PasswordResetResponse: Decodable {
    let email: String?
}

private struct AuthResponse: Decodable {
    let localId: String
    let email: String
    let displayName: String?
    let photoUrl: String?
    let providerId: String?
    let idToken: String
    let refreshToken: String

    var user: AuthUser {
        AuthUser(
            uid: localId,
            email: email,
            displayName: displayName,
            photoURL: photoUrl.flatMap(URL.init(string:)),
            provider: providerId,
            idToken: idToken,
            refreshToken: refreshToken
        )
    }
}

enum GoogleOAuthError: LocalizedError {
    case missingClientID
    case invalidAuthorizationURL
    case cancelled
    case missingAuthorizationCode
    case tokenExchangeFailed(String)
    case missingIDToken
    case invalidCallback
    case stateMismatch

    var errorDescription: String? {
        switch self {
        case .missingClientID:
            return "Add your Google OAuth client ID in SilviaAI/Resources/Config.plist before using Google sign-in."
        case .invalidAuthorizationURL:
            return "Silvia could not build the Google sign-in URL."
        case .cancelled:
            return "Google sign-in was cancelled."
        case .missingAuthorizationCode:
            return "Google did not return an authorization code."
        case .tokenExchangeFailed(let message):
            return message.isEmpty ? "Google sign-in token exchange failed." : message
        case .missingIDToken:
            return "Google did not return an ID token."
        case .invalidCallback:
            return "Google returned an invalid sign-in callback."
        case .stateMismatch:
            return "Google sign-in could not be verified. Please try again."
        }
    }
}

struct GoogleOAuthToken {
    let idToken: String
    let accessToken: String?
}

@MainActor
final class GoogleOAuthService: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var authSession: ASWebAuthenticationSession?
    private let urlSession: URLSession

    init(urlSession: URLSession = .shared) {
        self.urlSession = urlSession
    }

    func signIn() async throws -> GoogleOAuthToken {
        guard let clientID = Self.googleClientID, !clientID.isEmpty, clientID != "PASTE_YOUR_GOOGLE_OAUTH_CLIENT_ID_HERE" else {
            throw GoogleOAuthError.missingClientID
        }

        let redirectScheme = Self.googleRedirectScheme(for: clientID)
        let redirectURI = "\(redirectScheme):/oauth2redirect"
        let verifier = Self.randomURLSafeString(byteCount: 48)
        let challenge = Self.codeChallenge(for: verifier)
        let state = Self.randomURLSafeString(byteCount: 24)

        guard var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth") else {
            throw GoogleOAuthError.invalidAuthorizationURL
        }
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "prompt", value: "select_account")
        ]
        guard let authURL = components.url else { throw GoogleOAuthError.invalidAuthorizationURL }

        let callbackURL = try await authenticate(authURL: authURL, callbackURLScheme: redirectScheme)
        guard let callbackComponents = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else {
            throw GoogleOAuthError.invalidCallback
        }
        let queryItems = callbackComponents.queryItems ?? []
        let returnedState = queryItems.first { $0.name == "state" }?.value
        guard returnedState == state else { throw GoogleOAuthError.stateMismatch }
        guard let code = queryItems.first(where: { $0.name == "code" })?.value else {
            throw GoogleOAuthError.missingAuthorizationCode
        }

        return try await exchangeCodeForToken(
            code: code,
            verifier: verifier,
            clientID: clientID,
            redirectURI: redirectURI
        )
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? UIWindow()
    }

    private func authenticate(authURL: URL, callbackURLScheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: authURL, callbackURLScheme: callbackURLScheme) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin {
                    continuation.resume(throwing: GoogleOAuthError.cancelled)
                    return
                }
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: GoogleOAuthError.invalidCallback)
                    return
                }
                continuation.resume(returning: callbackURL)
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            authSession = session
            if !session.start() {
                continuation.resume(throwing: GoogleOAuthError.invalidAuthorizationURL)
            }
        }
    }

    private func exchangeCodeForToken(
        code: String,
        verifier: String,
        clientID: String,
        redirectURI: String
    ) async throws -> GoogleOAuthToken {
        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 45
        request.httpBody = Self.formBody([
            "client_id": clientID,
            "code": code,
            "code_verifier": verifier,
            "grant_type": "authorization_code",
            "redirect_uri": redirectURI
        ])

        let (data, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw GoogleOAuthError.tokenExchangeFailed(Self.parseOAuthError(from: data))
        }
        let token = try JSONDecoder().decode(GoogleTokenResponse.self, from: data)
        guard let idToken = token.idToken, !idToken.isEmpty else { throw GoogleOAuthError.missingIDToken }
        return GoogleOAuthToken(idToken: idToken, accessToken: token.accessToken)
    }

    private static var googleClientID: String? {
        configValue("GOOGLE_CLIENT_ID")
    }

    private static func googleRedirectScheme(for clientID: String) -> String {
        let configured = configValue("GOOGLE_REDIRECT_SCHEME")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let placeholders = [
            "",
            "com.your.google.redirect.scheme",
            "PASTE_YOUR_REVERSED_GOOGLE_CLIENT_ID_HERE"
        ]
        guard placeholders.contains(configured) else { return configured }
        return reversedClientScheme(for: clientID) ?? "com.silviaai.app"
    }

    private static func reversedClientScheme(for clientID: String) -> String? {
        let suffix = ".apps.googleusercontent.com"
        guard clientID.hasSuffix(suffix) else { return nil }
        let clientPrefix = String(clientID.dropLast(suffix.count))
        guard !clientPrefix.isEmpty else { return nil }
        return "com.googleusercontent.apps.\(clientPrefix)"
    }

    private static func configValue(_ key: String) -> String? {
        guard let url = Bundle.main.url(forResource: Constants.configFileName, withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil),
              let dictionary = plist as? [String: Any]
        else { return nil }
        return dictionary[key] as? String
    }

    private static func codeChallenge(for verifier: String) -> String {
        let digest = SHA256.hash(data: Data(verifier.utf8))
        return Data(digest).base64URLEncodedString()
    }

    private static func randomURLSafeString(byteCount: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64URLEncodedString()
    }

    private static func formBody(_ values: [String: String]) -> Data {
        values
            .map { key, value in
                "\(key)=\(formEncode(value))"
            }
            .joined(separator: "&")
            .data(using: .utf8) ?? Data()
    }

    private static func formEncode(_ value: String) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    private static func parseOAuthError(from data: Data) -> String {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let error = object["error_description"] as? String ?? object["error"] as? String
        else { return String(data: data, encoding: .utf8) ?? "" }
        return error
    }
}

private struct GoogleTokenResponse: Decodable {
    let accessToken: String?
    let idToken: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case idToken = "id_token"
    }
}

private extension Data {
    func base64URLEncodedString() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
