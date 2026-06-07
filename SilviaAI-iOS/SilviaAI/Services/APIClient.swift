import Foundation

enum APIClientError: LocalizedError {
    case missingAPIKey
    case invalidURL
    case transport(Error)
    case noData
    case emptyResponse
    case api(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "Add your Gemini API key in SilviaAI/Resources/Config.plist before sending a message."
        case .invalidURL:
            return "Silvia could not build the Gemini request URL."
        case .transport(let error):
            return "Network problem: \(error.localizedDescription)"
        case .noData:
            return "Gemini returned no data. Please try again."
        case .emptyResponse:
            return "Gemini returned an empty response. Try rephrasing your message."
        case .api(let status, let message):
            if status == 400, message.localizedCaseInsensitiveContains("API key") {
                return "Invalid API key. Check SilviaAI/Resources/Config.plist and try again."
            }
            if status == 403 {
                return "Access denied. Confirm your key is valid and the selected Gemini model is enabled."
            }
            if status == 429 {
                return "Rate limit reached. Please wait a moment and try again."
            }
            return message.isEmpty ? "Request failed (\(status))." : message
        }
    }
}

struct APIClient {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func postJSON(to url: URL, body: [String: Any]) async throws -> Data {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 90
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { return data }
            guard (200..<300).contains(http.statusCode) else {
                throw APIClientError.api(status: http.statusCode, message: parseErrorMessage(from: data))
            }
            return data
        } catch let error as APIClientError {
            throw error
        } catch {
            throw APIClientError.transport(error)
        }
    }

    private func parseErrorMessage(from data: Data) -> String {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let error = object["error"] as? [String: Any],
            let message = error["message"] as? String
        else { return String(data: data, encoding: .utf8) ?? "" }
        return message
    }
}
