/**
 * UI Preview: Image Upload with Warning Message
 * Shows how the warning message appears in the FileComplaint form
 */

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    UI UPDATE: Image Upload Section                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

The following message now appears right under the image upload area:

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Add Photos (optional, max 5)                                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                    │    │
│  │        UPLOAD                                                     │    │
│  │        Click to upload photos of the issue                        │    │
│  │        Photos help resolve issues 2x faster                       │    │
│  │                                                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ⚠️  Make sure image matches the issue you're reporting               ← NEW │
│                                                                              │
│  <uploaded images thumbnails would appear here>                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

STYLING DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Background:    #FFF9C4 (light yellow)
Border:        1px solid #FDD835 (golden)
Text Color:    #F57F17 (dark orange/brown)
Icon:          ⚠️ (warning emoji)
Font Size:     0.8rem (smaller, like helper text)
Padding:       10px 12px
Border Radius: var(--radius-sm)

Position:      Appears below the upload area, above uploaded image thumbnails
Visibility:    Always visible (unlike error/success messages)
Tone:          Advisory/warning (not aggressive)

USE CASE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When users are about to upload images for their complaint, they see this reminder
that their image must match the issue they're reporting. This helps prevent:

✓ Uploading photos of wrong location/issue
✓ Uploading unrelated images (fraud attempts)
✓ Late discovery of image-complaint mismatch
✓ Unnecessary manual review cycles

The message is:
- ✅ Prominent but not intrusive
- ✅ Color-coded for warning (yellow/orange)
- ✅ Friendly tone with emoji
- ✅ Clear actionable guidance

FRONTEND FILE MODIFIED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 frontend/src/pages/citizen/FileComplaint.jsx
   Location: Image upload form section (Step 2)
   Change: Added warning message below upload area
   
CODE ADDED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<div style={{
  marginTop: 10,
  padding: '10px 12px',
  background: '#FFF9C4',
  border: '1px solid #FDD835',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.8rem',
  color: '#F57F17',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 8
}}>
  ⚠️ <span>Make sure image matches the issue you're reporting</span>
</div>

WHEN USER SEES THIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Complaint filed: "Pothole on MG Road"
2. User clicks to upload photo
3. Message appears: "⚠️ Make sure image matches the issue you're reporting"
4. User is reminded to upload photo of POTHOLE, not something else
5. User uploads correct image → Image analysis validates match
6. System processes complaint with verified image

BEFORE UPLOAD:   Message reminds user
AFTER UPLOAD:    "🔍 Analyze Image" button lets them validate
AFTER ANALYSIS:  Results show if image matches complaint (VERIFIED/MISMATCH)
`);
