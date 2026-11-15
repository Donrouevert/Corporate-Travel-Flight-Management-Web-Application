import type { CabinClass, FlightSchedule } from '../types/travel';
export interface FlightFilters { origin?: string; destination?: string; date?: string; travelType?: string; airline?: string; cabinClass?: CabinClass; ecoOnly?: boolean; maxPrice?: number; minBaggage?: number; travelers?: number; timeFrom?: string; timeTo?: string; }
export const cabinMultiplier: Record<CabinClass, number> = { Economy: 1, 'Premium Economy': 1.65, Business: 2.8 };
export function filterFlights(flights: FlightSchedule[], f: FlightFilters): FlightSchedule[] {
  return flights.filter(s => {
    const time = s.departureTimestamp.slice(11, 16);
    return s.status !== 'CANCELLED' && (!f.origin || s.origin === f.origin) && (!f.destination || s.destination === f.destination)
      && (!f.date || s.departureTimestamp.slice(0, 10) === f.date) && (!f.travelType || s.travelType === f.travelType)
      && (!f.airline || s.airline === f.airline) && (!f.ecoOnly || s.ecoChoice)
      && (s.seats[f.cabinClass ?? 'Economy'] >= (f.travelers ?? 1))
      && (f.maxPrice === undefined || s.baseFare * cabinMultiplier[f.cabinClass ?? 'Economy'] + s.taxesAndFees <= f.maxPrice)
      && (f.minBaggage === undefined || s.baggageAllowanceKg >= f.minBaggage)
      && (!f.timeFrom || time >= f.timeFrom) && (!f.timeTo || time <= f.timeTo);
  }).sort((a, b) => a.baseFare - b.baseFare);
}
