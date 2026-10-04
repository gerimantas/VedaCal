import { computeDay, computeMonth } from '../../src/core/panchang'

const vilnius = { name: 'Vilnius', country: 'LT', lat: 54.68916, lon: 25.2798, elevation: 98, tz: 'Europe/Vilnius' }
const t0 = performance.now()
computeMonth(2026, 10, vilnius) // cold: nothing cached
const t1 = performance.now()
computeDay('2027-03-15', vilnius) // one day, cold
const t2 = performance.now()
document.getElementById('out')!.textContent = JSON.stringify({ monthMs: Math.round(t1 - t0), dayMs: Math.round(t2 - t1) })
