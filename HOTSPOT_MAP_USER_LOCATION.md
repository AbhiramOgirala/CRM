# Hotspot Map - User Registered Location Feature

## Overview
When a logged-in user (citizen, officer, or admin) opens the Hotspot Map, the map automatically centers on their registered location and filters complaints by their registered state AND district for a more focused, zoomed-in view.

## Implementation

### Automatic Location Loading
When a logged-in user opens the Hotspot Map:

1. **State + District Filters Applied**: User's registered `state_id` AND `district_id` are automatically set as filters
2. **Address Geocoding**: User's registered address and pincode are geocoded to get precise coordinates
3. **Higher Zoom Level**: Map automatically zooms to level 12 (district/locality level) instead of state level
4. **Visual Marker**: A blue marker shows the user's registered location on the map
5. **Focused View**: Only complaints from user's district are shown for better relevance

### Geocoding Process
The system builds a search query from the user's registration data:
- Address
- Pincode
- District name (fetched from district_id)
- State name (fetched from state_id)
- Country (India)

This query is sent to OpenStreetMap's Nominatim API to get precise coordinates.

### Fallback Behavior
If geocoding fails or user has incomplete data:
1. **Has district**: Geocodes district name → centers at zoom level 10
2. **Has only state**: Centers on state → zoom level 8
3. **No location data**: Shows default India view → zoom level 5

## Zoom Levels
- **Address geocoded**: Zoom 12 (street/locality level)
- **District geocoded**: Zoom 10 (district level)
- **State only**: Zoom 8 (state level)
- **Default**: Zoom 5 (country level)

## User Experience

### For Logged-in Users
- Map opens centered on their registered location at district level
- State AND district filters are pre-selected based on their registration
- Shows only complaints from their district for focused view
- Blue marker indicates "Your registered location"
- Visual indicator shows "Map centered on your registered location (District Name)"

### Additional Controls
- **🏠 My Registered Location** button: Manually re-center on registered location with district filter
- **📍 Use GPS Location** button: Override with current GPS location
- **🗺️ Focus My State** button: Center on state view
- **District dropdown**: Filter complaints by specific district within selected state

### For Non-logged-in Users
- Map shows default India view
- No automatic location loading
- Can still use GPS location button

## Technical Details

### Data Sources
- User location data from `authStore.user`:
  - `state_id`: User's registered state
  - `district_id`: User's registered district
  - `address`: User's registered address
  - `pincode`: User's registered pincode

### Geocoding API
- Service: OpenStreetMap Nominatim
- Endpoint: `https://nominatim.openstreetmap.org/search`
- Format: JSON
- Limit: 1 result

### Map Behavior
- Zoom level: 12 for address (district/locality level)
- Zoom level: 10 for district (when no address)
- Zoom level: 8 for state only
- Animation: Smooth fly-to transition (0.8s duration)
- Marker: Blue circle with white border
- Popup: "📍 Your registered location"
- Filters: Both state_id AND district_id applied automatically

## Files Modified

- `CRM/frontend/src/pages/public/HotspotMap.jsx`
  - Added `useAuthStore` import
  - Added `user` from auth store
  - Added `districts` state for district dropdown
  - Updated filters to include `district_id`
  - Added `loadUserRegisteredLocation()` function with district filtering
  - Added useEffect to auto-load user location on mount
  - Added useEffect to load districts when state changes
  - Added district dropdown in filter bar
  - Added "My Registered Location" button
  - Updated user marker popup text
  - Added visual indicator showing district name
  - Increased zoom levels for more focused view (12 for address, 10 for district)

## Testing

### Test Scenario 1: Logged-in User with Address
1. Login as any user (citizen/officer/admin) with address and district
2. Navigate to Hotspot Map
3. Map should automatically center on user's registered location at zoom 12
4. Blue marker should appear at registered location
5. State AND district filters should be pre-selected
6. Only complaints from user's district should be shown

### Test Scenario 2: Logged-in User with District but No Address
1. Login as user with state and district but no address
2. Navigate to Hotspot Map
3. Map should center on user's district at zoom 10
4. State AND district filters should be pre-selected
5. Only complaints from user's district should be shown

### Test Scenario 3: Logged-in User with Only State
1. Login as user with only state (no district/address)
2. Navigate to Hotspot Map
3. Map should center on user's state at zoom 8
4. State filter should be pre-selected
5. All complaints from user's state should be shown

### Test Scenario 3: Non-logged-in User
1. Open Hotspot Map without logging in
2. Map should show default India view
3. No automatic location loading

### Test Scenario 4: Manual Controls
1. Login and open Hotspot Map
2. Click "Use GPS Location" - should override with current GPS
3. Click "My Registered Location" - should return to registered location with district filter
4. Change district dropdown - should update complaints shown
5. All controls should work independently

### Test Scenario 5: District Filtering
1. Login with district data
2. Open Hotspot Map
3. Verify only complaints from user's district are shown
4. Change to "All Districts" - should show all complaints from state
5. Select different district - should show complaints from that district

## Benefits

✅ Personalized experience for logged-in users
✅ District-level filtering for highly relevant complaints
✅ Higher zoom level (12) for better detail visibility
✅ Immediate relevance - shows complaints in user's district
✅ No manual location selection needed
✅ Respects user's registration data (state + district)
✅ Works for all user roles (citizen, officer, admin)
✅ Graceful fallback hierarchy (address → district → state → default)
✅ District dropdown allows exploring other districts in same state
