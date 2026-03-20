const { supabase } = require('../config/supabase');
const geocoding = require('../services/geocodingService');

/**
 * Utility to geocode existing complaints that don't have GPS coordinates
 */
async function geocodeExistingComplaints() {
  try {
    console.log('🔍 Finding complaints without GPS coordinates...');
    
    // Get complaints without GPS coordinates but with address information
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('id, ticket_number, address, landmark, pincode, state_id, district_id, mandal_id')
      .is('latitude', null)
      .is('longitude', null)
      .not('address', 'is', null);

    if (error) {
      console.error('Error fetching complaints:', error);
      return;
    }

    if (!complaints || complaints.length === 0) {
      console.log('✅ No complaints found that need geocoding');
      return;
    }

    console.log(`📍 Found ${complaints.length} complaints to geocode`);
    
    let successCount = 0;
    let failCount = 0;

    for (const complaint of complaints) {
      try {
        console.log(`\n🔄 Processing ${complaint.ticket_number}: ${complaint.address}`);
        
        const geocodeResult = await geocoding.geocodeComplaintLocation({
          address: complaint.address,
          landmark: complaint.landmark,
          pincode: complaint.pincode,
          state_id: complaint.state_id,
          district_id: complaint.district_id,
          mandal_id: complaint.mandal_id
        });

        if (geocodeResult && geocoding.isValidCoordinates(geocodeResult.latitude, geocodeResult.longitude)) {
          // Update the complaint with GPS coordinates
          const { error: updateError } = await supabase
            .from('complaints')
            .update({
              latitude: geocodeResult.latitude,
              longitude: geocodeResult.longitude,
              address: geocodeResult.formatted_address || complaint.address
            })
            .eq('id', complaint.id);

          if (updateError) {
            console.error(`❌ Failed to update ${complaint.ticket_number}:`, updateError);
            failCount++;
          } else {
            console.log(`✅ ${complaint.ticket_number}: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
            successCount++;
          }
        } else {
          console.log(`❌ ${complaint.ticket_number}: Geocoding failed`);
          failCount++;
        }

        // Add a small delay to be respectful to the geocoding service
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`❌ Error processing ${complaint.ticket_number}:`, err.message);
        failCount++;
      }
    }

    console.log(`\n📊 Geocoding Summary:`);
    console.log(`✅ Successfully geocoded: ${successCount} complaints`);
    console.log(`❌ Failed to geocode: ${failCount} complaints`);
    console.log(`📍 Total processed: ${complaints.length} complaints`);

  } catch (err) {
    console.error('❌ Error in geocoding process:', err);
  }
}

module.exports = { geocodeExistingComplaints };