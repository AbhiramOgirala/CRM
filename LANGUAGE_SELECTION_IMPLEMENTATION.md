# Language Selection Modal Implementation

## Overview
This implementation adds a language selection modal that appears automatically when desktop/laptop users first visit the application. The modal prompts users to select their preferred language from all available languages in the system.

## Features

### 1. Automatic Language Prompt
- Modal appears automatically on first visit for desktop/laptop users (screen width > 768px)
- Does not appear on mobile devices to avoid disrupting the mobile experience
- Only shows once - preference is stored in localStorage

### 2. Language Persistence
- Selected language is stored in localStorage as `preferredLanguage`
- A flag `languageSelected` is set to prevent the modal from showing again
- Language preference persists across sessions

### 3. Multi-language Support
The modal supports all 11 languages available in the application:
- English (en-IN)
- Hindi (hi-IN) - हिंदी
- Telugu (te-IN) - తెలుగు
- Tamil (ta-IN) - தமிழ்
- Kannada (kn-IN) - ಕನ್ನಡ
- Malayalam (ml-IN) - മലയാളം
- Marathi (mr-IN) - मराठी
- Gujarati (gu-IN) - ગુજરાતી
- Punjabi (pa-IN) - ਪੰਜਾਬੀ
- Bengali (bn-IN) - বাংলা
- Urdu (ur-IN) - اردو

### 4. User Experience
- Clean, accessible modal design with backdrop
- Grid layout showing all languages with native script
- Visual feedback on selection
- Can be changed anytime from the language menu in the navbar

## Files Modified

### New Files Created
1. `CRM/frontend/src/components/common/LanguageSelectionModal.jsx`
   - Main modal component
   - Handles language selection logic
   - Manages localStorage persistence

### Modified Files
1. `CRM/frontend/src/App.jsx`
   - Added LanguageSelectionModal import and component

2. `CRM/frontend/src/context/LanguageContext.jsx`
   - Updated to check localStorage for saved language preference on initialization
   - Automatically saves language preference when changed

3. Translation files (all languages):
   - `CRM/frontend/public/locales/*/translation.json`
   - Added `lang_modal` section with:
     - `title`: Modal title
     - `subtitle`: Modal description
     - `btn_continue`: Continue button text

## How It Works

### Flow
1. User opens the application on desktop/laptop
2. LanguageSelectionModal checks:
   - Is screen width > 768px? (desktop check)
   - Has `languageSelected` flag in localStorage?
3. If both conditions are met, modal displays
4. User selects preferred language
5. On "Continue":
   - Language is applied via LanguageContext
   - `languageSelected` flag is set in localStorage
   - `preferredLanguage` is saved in localStorage
   - Modal closes

### Subsequent Visits
- LanguageContext reads `preferredLanguage` from localStorage
- Application starts with user's preferred language
- Modal does not appear again

### Changing Language Later
Users can change their language anytime using:
- Desktop: Language dropdown in navbar (native select with flag icon)
- Mobile: Language button in navbar (opens popover menu)

## Technical Details

### Detection Logic
```javascript
const isDesktop = window.matchMedia('(min-width: 769px)').matches;
const hasSelectedLanguage = localStorage.getItem('languageSelected');

if (isDesktop && !hasSelectedLanguage) {
  // Show modal
}
```

### Storage Keys
- `languageSelected`: Boolean flag (string 'true')
- `preferredLanguage`: Language code (e.g., 'en-IN', 'hi-IN')

### Accessibility
- Modal uses proper ARIA attributes
- `role="dialog"`
- `aria-labelledby` for title
- `aria-modal="true"`
- Backdrop with blur effect
- Keyboard-accessible buttons

## Testing

### To Test the Modal
1. Clear localStorage: `localStorage.clear()`
2. Refresh the page on desktop/laptop
3. Modal should appear
4. Select a language and click "Continue"
5. Refresh - modal should not appear again
6. Check that the entire application reflects the selected language

### To Reset
```javascript
localStorage.removeItem('languageSelected');
localStorage.removeItem('preferredLanguage');
```

## Future Enhancements
- Add language detection based on browser settings
- Add option to "Skip for now" with reminder later
- Add language recommendation based on location
- Add analytics to track language preferences
