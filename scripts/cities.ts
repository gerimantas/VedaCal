// Test cities shared by the fixture fetchers and the validation tests.
export const CITIES = {
  vilnius: { drikId: 593116, drikName: 'Vilnius', lat: 54.68916, lon: 25.2798, elevation: 98, tz: 'Europe/Vilnius', mypanchang: null },
  'new-york': { drikId: 5128581, drikName: 'New York', lat: 40.71427, lon: -74.00597, elevation: 10, tz: 'America/New_York', mypanchang: { head: 'New York, NY', id: 'NewYork-NY' } },
  'new-delhi': { drikId: 1261481, drikName: 'New Delhi', lat: 28.63576, lon: 77.22445, elevation: 216, tz: 'Asia/Kolkata', mypanchang: { head: 'New Delhi', id: 'NewDelhi-India' } },
} as const

export type CityKey = keyof typeof CITIES
