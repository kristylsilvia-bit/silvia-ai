import SwiftUI

struct AuthScreenView: View {
    enum Mode {
        case signIn
        case signUp
        case reset
    }

    @ObservedObject var authViewModel: AuthViewModel
    let allowsGuest: Bool
    let onContinueAsGuest: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var mode: Mode = .signIn
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                Theme.background.ignoresSafeArea()
                authAurora
                authContent(
                    metrics: AuthLayoutMetrics(height: proxy.size.height),
                    availableHeight: proxy.size.height
                )
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            authViewModel.clearMessages()
        }
        .onChange(of: authViewModel.isSignedIn) { _, signedIn in
            if signedIn {
                dismiss()
            }
        }
    }

    private func authContent(metrics: AuthLayoutMetrics, availableHeight: CGFloat) -> some View {
        ScrollView {
            VStack(spacing: metrics.contentSpacing) {
                hero(metrics)
                authPanel(metrics)
            }
            .padding(.horizontal, metrics.horizontalPadding)
            .padding(.vertical, metrics.verticalPadding)
            .frame(maxWidth: 430)
            .frame(maxWidth: .infinity)
            .frame(minHeight: availableHeight, alignment: .center)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func hero(_ metrics: AuthLayoutMetrics) -> some View {
        VStack(spacing: metrics.heroSpacing) {
            ZStack {
                RoundedRectangle(cornerRadius: metrics.logoCornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .frame(width: metrics.logoTileSize, height: metrics.logoTileSize)
                    .overlay(RoundedRectangle(cornerRadius: metrics.logoCornerRadius, style: .continuous).stroke(Color.white.opacity(0.16)))
                    .shadow(color: Color.blue.opacity(0.24), radius: 26, y: 12)
                Circle()
                    .fill(Theme.accent)
                    .frame(width: metrics.logoCircleSize, height: metrics.logoCircleSize)
                    .shadow(color: Color.cyan.opacity(0.34), radius: 22, y: 8)
                Image(systemName: "sparkles")
                    .font(.system(size: metrics.logoIconSize, weight: .bold))
                    .foregroundStyle(.white)
            }
            titleBlock(metrics)
        }
    }

    private func titleBlock(_ metrics: AuthLayoutMetrics) -> some View {
        VStack(spacing: metrics.titleSpacing) {
            Text(Constants.appName)
                .font(.system(size: metrics.appNameFontSize, weight: .bold, design: .rounded))
                .foregroundStyle(Color.white.opacity(0.72))
            Text(title)
                .font(.system(size: metrics.titleFontSize, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.82)
            Text(subtitle)
                .font(.system(size: metrics.subtitleFontSize, weight: .medium, design: .rounded))
                .foregroundStyle(Color.white.opacity(0.70))
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .lineSpacing(2)
                .padding(.horizontal, 2)
        }
    }

    private func authPanel(_ metrics: AuthLayoutMetrics) -> some View {
        VStack(spacing: metrics.panelSpacing) {
            if mode != .reset {
                modePicker(metrics)
            }
            if mode != .reset {
                googleButton(metrics)
                divider
            }
            fields(metrics)
            messageArea
            primaryButton(metrics)
            secondaryControls(metrics)
        }
        .padding(metrics.panelPadding)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).stroke(Color.white.opacity(0.14)))
        .shadow(color: Color.black.opacity(0.30), radius: 22, y: 12)
    }

    private func modePicker(_ metrics: AuthLayoutMetrics) -> some View {
        HStack(spacing: 6) {
            modeButton("Sign in", mode: .signIn, metrics: metrics)
            modeButton("Create", mode: .signUp, metrics: metrics)
        }
        .padding(5)
        .background(Color.white.opacity(0.08), in: Capsule())
    }

    private func modeButton(_ label: String, mode nextMode: Mode, metrics: AuthLayoutMetrics) -> some View {
        Button {
            switchMode(nextMode)
        } label: {
            Text(label)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(mode == nextMode ? Color.white : Color.white.opacity(0.58))
                .frame(maxWidth: .infinity)
                .padding(.vertical, metrics.segmentVerticalPadding)
                .background {
                    if mode == nextMode {
                        Capsule().fill(Theme.accent)
                    }
                }
        }
        .buttonStyle(.plain)
    }

    private func googleButton(_ metrics: AuthLayoutMetrics) -> some View {
        Button {
            Task { await authViewModel.signInWithGoogle() }
        } label: {
            ZStack {
                HStack {
                    Image("GoogleGLogo")
                        .resizable()
                        .renderingMode(.original)
                        .interpolation(.high)
                        .frame(width: 30, height: 30)
                    Spacer()
                }
                Text(authViewModel.isBusy ? "Connecting..." : "Continue with Google")
                    .font(.headline.weight(.bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.86)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.leading, 13)
            .padding(.trailing, 16)
            .padding(.vertical, metrics.buttonVerticalPadding)
            .background(Color.white.opacity(0.13), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.white.opacity(0.16)))
        }
        .disabled(authViewModel.isBusy)
    }

    private var divider: some View {
        HStack(spacing: 10) {
            Rectangle().fill(Color.white.opacity(0.14)).frame(height: 1)
            Text("or")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.white.opacity(0.54))
            Rectangle().fill(Color.white.opacity(0.14)).frame(height: 1)
        }
    }

    private func fields(_ metrics: AuthLayoutMetrics) -> some View {
        VStack(spacing: metrics.fieldSpacing) {
            TextField("Email", text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(mode == .reset ? .send : .next)
                .onSubmit {
                    if mode == .reset {
                        runPrimaryAction()
                    }
                }
                .authFieldStyle(verticalPadding: metrics.fieldVerticalPadding)

            if mode != .reset {
                SecureField("Password", text: $password)
                    .textContentType(mode == .signUp ? .newPassword : .password)
                    .submitLabel(.go)
                    .onSubmit { runPrimaryAction() }
                    .authFieldStyle(verticalPadding: metrics.fieldVerticalPadding)
            }
        }
    }

    @ViewBuilder
    private var messageArea: some View {
        if let error = authViewModel.errorMessage, !error.isEmpty {
            Text(error)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Theme.error.opacity(0.76), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        } else if let info = authViewModel.infoMessage, !info.isEmpty {
            Text(info)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Color.green.opacity(0.28), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.green.opacity(0.24)))
        }
    }

    private func primaryButton(_ metrics: AuthLayoutMetrics) -> some View {
        Button {
            runPrimaryAction()
        } label: {
            HStack(spacing: 10) {
                if authViewModel.isBusy {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: primaryIcon)
                }
                Text(authViewModel.isBusy ? "Please wait..." : primaryTitle)
            }
            .font(.headline.weight(.bold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, metrics.primaryVerticalPadding)
            .background(Theme.accent, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .foregroundStyle(.white)
            .shadow(color: Color.blue.opacity(0.32), radius: 15, y: 7)
        }
        .disabled(authViewModel.isBusy)
    }

    private func secondaryControls(_ metrics: AuthLayoutMetrics) -> some View {
        VStack(spacing: metrics.secondarySpacing) {
            if mode == .signIn {
                Button("Forgot password?") { switchMode(.reset) }
            } else if mode == .reset {
                Button("Back to sign in") { switchMode(.signIn) }
            }
            if allowsGuest {
                guestButton(metrics)
            }
        }
        .font(.callout.weight(.semibold))
        .foregroundStyle(Color.white.opacity(0.80))
    }

    private func guestButton(_ metrics: AuthLayoutMetrics) -> some View {
        Button {
            authViewModel.clearMessages()
            onContinueAsGuest()
            dismiss()
        } label: {
            Text("Continue as guest")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Color.white.opacity(0.70))
                .frame(maxWidth: .infinity)
                .padding(.vertical, metrics.guestVerticalPadding)
                .background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private var authAurora: some View {
        ZStack {
            Circle().fill(Color.purple.opacity(0.24)).frame(width: 280, height: 280).blur(radius: 70).offset(x: -130, y: -250)
            Circle().fill(Color.cyan.opacity(0.18)).frame(width: 280, height: 280).blur(radius: 80).offset(x: 150, y: 180)
        }
        .ignoresSafeArea()
    }

    private var title: String {
        switch mode {
        case .signIn: return "Create without friction."
        case .signUp: return "Start something brilliant."
        case .reset: return "Reset your password."
        }
    }

    private var subtitle: String {
        switch mode {
        case .signIn: return "Jump into your chats, images, voice notes, and ideas with one tap."
        case .signUp: return "Make a home for your creative work and keep every thread close."
        case .reset: return "Silvia will send a secure reset link."
        }
    }

    private var primaryTitle: String {
        switch mode {
        case .signIn: return "Sign in"
        case .signUp: return "Create account"
        case .reset: return "Send reset email"
        }
    }

    private var primaryIcon: String {
        switch mode {
        case .signIn: return "arrow.right.circle.fill"
        case .signUp: return "person.crop.circle.badge.plus"
        case .reset: return "envelope.fill"
        }
    }

    private func switchMode(_ nextMode: Mode) {
        mode = nextMode
        password = ""
        authViewModel.clearMessages()
    }

    private func runPrimaryAction() {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedEmail.isEmpty else {
            authViewModel.errorMessage = "Enter your email."
            return
        }
        if mode != .reset, trimmedPassword.isEmpty {
            authViewModel.errorMessage = "Enter your password."
            return
        }

        Task {
            switch mode {
            case .signIn:
                await authViewModel.signIn(email: trimmedEmail, password: trimmedPassword)
            case .signUp:
                await authViewModel.signUp(email: trimmedEmail, password: trimmedPassword)
            case .reset:
                await authViewModel.sendPasswordReset(email: trimmedEmail)
            }
        }
    }
}

private struct AuthLayoutMetrics {
    let isCompact: Bool
    let isTiny: Bool

    init(height: CGFloat) {
        isTiny = height < 700
        isCompact = height < 790
    }

    var horizontalPadding: CGFloat { isTiny ? 18 : 22 }
    var verticalPadding: CGFloat { isTiny ? 12 : (isCompact ? 16 : 22) }
    var contentSpacing: CGFloat { isTiny ? 12 : (isCompact ? 14 : 16) }
    var heroSpacing: CGFloat { isTiny ? 9 : 12 }
    var titleSpacing: CGFloat { isTiny ? 5 : 7 }
    var logoTileSize: CGFloat { isTiny ? 76 : (isCompact ? 90 : 104) }
    var logoCircleSize: CGFloat { isTiny ? 48 : (isCompact ? 58 : 66) }
    var logoIconSize: CGFloat { isTiny ? 23 : (isCompact ? 27 : 31) }
    var logoCornerRadius: CGFloat { isTiny ? 22 : (isCompact ? 26 : 30) }
    var appNameFontSize: CGFloat { isTiny ? 15 : 17 }
    var titleFontSize: CGFloat { isTiny ? 27 : (isCompact ? 30 : 33) }
    var subtitleFontSize: CGFloat { isTiny ? 13 : (isCompact ? 14 : 15) }
    var panelPadding: CGFloat { isTiny ? 12 : 14 }
    var panelSpacing: CGFloat { isTiny ? 9 : 11 }
    var segmentVerticalPadding: CGFloat { isTiny ? 7 : 8 }
    var buttonVerticalPadding: CGFloat { isTiny ? 11 : 12 }
    var primaryVerticalPadding: CGFloat { isTiny ? 12 : 14 }
    var fieldVerticalPadding: CGFloat { isTiny ? 11 : 12 }
    var fieldSpacing: CGFloat { isTiny ? 9 : 10 }
    var secondarySpacing: CGFloat { isTiny ? 8 : 10 }
    var guestVerticalPadding: CGFloat { isTiny ? 9 : 10 }
}

private extension View {
    func authFieldStyle(verticalPadding: CGFloat) -> some View {
        self
            .font(.body)
            .foregroundStyle(.white)
            .tint(.cyan)
            .padding(.horizontal, 16)
            .padding(.vertical, verticalPadding)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Theme.panelStroke))
    }
}
