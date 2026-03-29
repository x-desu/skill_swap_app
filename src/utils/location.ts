export function calculateDistance(lat1: number | undefined | null, lng1: number | undefined | null, lat2: number | undefined | null, lng2: number | undefined | null): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return null; // Return null if either location is missing
  }

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Return rounded to 1 decimal place
  return Math.round(distance * 10) / 10;
}
