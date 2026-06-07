# Silvia AI for iOS

Silvia AI is a native SwiftUI iPhone app version of the existing Silvia AI Gemini chat studio. It preserves the project branding, model catalog, smart routing behavior, premium dark glass aesthetic, local chat history, Markdown-style replies, code blocks, generated-image display, copy/regenerate/clear actions, settings, and optional voice input / spoken replies.

## 1. Open the project in Xcode

1. Install **Xcode 16 or newer** from the Mac App Store.
2. Open `SilviaAI-iOS/SilviaAI.xcodeproj`.
3. Select the **SilviaAI** scheme in Xcode's toolbar.
4. Select an iPhone simulator such as **iPhone 16 Pro**.

## 2. Add your Gemini API key

The app reads its key from:

```text
SilviaAI-iOS/SilviaAI/Resources/Config.plist
```

1. Get a Gemini API key from Google AI Studio: <https://aistudio.google.com/apikey>
2. In Xcode, open `SilviaAI > Resources > Config.plist`.
3. Replace `PASTE_YOUR_GEMINI_API_KEY_HERE` with your real key.
4. Build and run.

`Config.example.plist` is included as the safe template. Do not commit a real private key.

## 3. Run on the iPhone simulator

1. In Xcode, pick a simulator from the device menu.
2. Press **⌘R**.
3. The app launches into the Silvia AI chat screen.
4. Type a message and tap the gradient send button.

If the key is missing, Silvia shows a friendly inline error instead of crashing.

## 4. Run on a real iPhone

1. Connect your iPhone with a USB cable or enable wireless debugging.
2. In Xcode, select your iPhone from the device menu.
3. Open the project settings, choose the **SilviaAI** target, and set **Signing & Capabilities > Team** to your Apple Developer team.
4. If needed, change the bundle identifier from `com.silviaai.app` to a unique value you own.
5. Press **⌘R** and trust the developer profile on the phone if iOS asks.

## 5. Change the app name or icon

- **Name:** Edit the target build setting `CFBundleDisplayName`, currently `Silvia AI`.
- **Icon:** Replace `SilviaAI/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` with your production 1024×1024 icon, then use Xcode's asset catalog if you want per-size variants.
- **Accent color:** Edit `SilviaAI/Resources/Assets.xcassets/AccentColor.colorset` or the Swift colors in `Utilities/Theme.swift`.

## 6. Troubleshooting

### Missing API key

Open `Resources/Config.plist` and replace the placeholder value under `GEMINI_API_KEY`.

### Invalid API key or 403

Confirm the key is valid, billing/quota are available, and the configured Gemini model IDs are enabled for your account.

### Model unavailable

The app preserves the existing repo's model IDs:

- `gemini-3.5-flash`
- `gemini-3.1-pro-preview`
- `gemini-3.1-flash-image`

If Google changes access to a model, update the `apiName` values in `Models/AppSettings.swift`.

### Speech or microphone prompt does not appear

Voice is optional. Tap the mic button, allow Speech Recognition and Microphone permissions, and test on a real device if the simulator audio input is unavailable.

### Signing error on device

Set your Apple Developer Team in Xcode and make the bundle identifier unique.

## 7. Files created

```text
SilviaAI-iOS/
  SilviaAI.xcodeproj
  SilviaAI/
    App/SilviaAIApp.swift
    Views/ChatView.swift
    Views/MessageBubbleView.swift
    Views/ComposerView.swift
    Views/SettingsView.swift
    Views/WelcomeView.swift
    ViewModels/ChatViewModel.swift
    ViewModels/SettingsViewModel.swift
    Models/ChatMessage.swift
    Models/ChatRole.swift
    Models/AppSettings.swift
    Services/AIService.swift
    Services/APIClient.swift
    Services/ChatStorageService.swift
    Services/SpeechService.swift
    Resources/Assets.xcassets
    Resources/LaunchScreen.storyboard
    Resources/Config.plist
    Resources/Config.example.plist
    Utilities/Haptics.swift
    Utilities/Theme.swift
    Utilities/Constants.swift
```

## 8. Included features

- Native SwiftUI app with an Xcode project.
- iOS 17+ deployment target.
- MVVM architecture.
- Premium dark-mode-first chat UI with glass panels and purple/blue gradients.
- Silvia AI header, online status, glowing orb/avatar, and suggested prompts.
- Gemini API client with safe `Config.plist` key loading.
- Existing smart model routing behavior: image prompts route to Nano Banana, analysis/file-language prompts route to Pro, and normal chat routes to Flash.
- Local chat persistence using Codable file storage.
- Settings for model selection, personality/system prompt, voice input, spoken replies, and clearing saved chats.
- Message copying, response regeneration, clear chat, animated typing indicator, haptics, keyboard-safe composer, and long-message support.
- Markdown-style inline formatting and readable code block rendering.
- Generated image display when the image model returns inline image data.
- Graceful error handling for missing keys, invalid keys, network failures, empty responses, and rate limits.
