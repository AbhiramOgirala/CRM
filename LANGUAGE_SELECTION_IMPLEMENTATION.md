# Language Selection Modal Implementation

## Overview
This implementation adds a language selection modal that automatically prompts desktop/laptop users to choose their preferred language every time they open the application. The language preference is stored only for the current browser session and resets when the browser is closed.

## Features

### 1. Automatic Language Prompt Every Time
- Modal appears automatically on every visit for desktop/laptop users (screen width > 768px)
- Does not appear on mobile devices to avoid disrupting the mobile experience
- Shows every time the browser is opened (no permanent caching)
- Language selection persists only during the current browser session

### 2. Session-Based Language Persistence
- Selected language is stored in sessionStorage (not localStorage)
- Preference persists during the current browser session only
- When browser is closed and reopened, user is prompted again
- Language can be changed anytime from navbar during the session

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
   - Updated to check sessionStorage for saved language preference on initialization
   - Automatically saves language preference to sessionStorage when changed
   - Language resets when browser is closed

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
   - Has `languageSelectedThisSession` flag in sessionStorage?
3. If desktop and no session flag, modal displays
4. User selects preferred language
5. On "Continue":
   - Language is applied via LanguageContext
   - `languageSelectedThisSession` flag is set in sessionStorage
   - `preferredLanguage` is saved in sessionStorage
   - Modal closes

### Subsequent Visits (Same Session)
- LanguageContext reads `preferredLanguage` from sessionStorage
- Application continues with user's selected language
- Modal does not appear again during the same browser session

### New Browser Session
- When browser is closed and reopened, sessionStorage is cleared
- User is prompted to select language again
- This ensures language selection happens every time on desktop/laptop

### Changing Language Later
Users can change their language anytime using:
- Desktop: Language dropdown in navbar (native select with flag icon)
- Mobile: Language button in navbar (opens popover menu)

## Technical Details

### Detection Logic
```javascript
const isDesktop = window.matchMedia('(min-width: 769px)').matches;
const hasSelectedInSession = sessionStorage.getItem('languageSelectedThisSession');

if (isDesktop && !hasSelectedInSession) {
  // Show modal
}
```

### Storage Keys (sessionStorage)
- `languageSelectedThisSession`: Boolean flag (string 'true') - cleared on browser close
- `preferredLanguage`: Language code (e.g., 'en-IN', 'hi-IN') - cleared on browser close

### Accessibility
- Modal uses proper ARIA attributes
- `role="dialog"`
- `aria-labelledby` for title
- `aria-modal="true"`
- Backdrop with blur effect
- Keyboard-accessible buttons

## Testing

### To Test the Modal
1. Open the application in a desktop browser
2. Language selection modal should appear automatically
3. Select a language and click "Continue"
4. Application should reflect the selected language
5. Refresh the page - language persists, modal doesn't show
6. Close the browser completely and reopen
7. Modal should appear again, prompting for language selection

### To Test During Development
If you want to see the modal again without closing the browser:
```javascript
sessionStorage.clear();
// Then refresh the page
```

## Future Enhancements
- Add language detection based on browser settings
- Add option to "Skip for now" with reminder later
- Add language recommendation based on location
- Add analytics to track language preferences
