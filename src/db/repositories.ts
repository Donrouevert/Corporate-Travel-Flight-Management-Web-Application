import { maximumPhp, validateTicketOverrides } from '../lib/ticketing';
import { cloudMode } from '../lib/supabase';
import { CloudRepository } from './cloudRepository';
import { db, type TravelDatabase } from './dexie';
import type { FlightSchedule, TravelRequest, User, TmcFulfillment } from '../types/travel';
import { calculateCosts, validateRequest } from '../lib/policy';
import { cabinMultiplier } from '../lib/flights';
import { today } from '../lib/format';
const roleRequired = (user: User, role: User['role']) => { if (user.role !== role) throw new Error(`This action requires the ${role.toLowerCase()} role.`); };
export class TravelRepository {
  constructor(public database: TravelDatabase = db) {}
  async listRequests() { return this.database.requests.orderBy('createdAt').reverse().toArray(); }
  async listFlights() { return this.database.flights.toArray(); }
  async listUsers() { return this.database.users.toArray(); }
  async listEvents() { return this.database.events.orderBy('timestamp').reverse().limit(20).toArray(); }
  async event(message: string, requestId?: string) { await this.database.events.add({ id: crypto.randomUUID(), message, requestId, timestamp: new Date().toISOString() }); }
  async submit(request: TravelRequest, user: User) {
    roleRequired(user, 'REQUESTOR');
    if (request.requestor.employeeId !== user.employeeId) throw new Error('You may only submit your own requests.');
    const errors = validateRequest(request); if (errors.length) throw new Error(errors[0]);
    if (request.tripDetails.departureDate < today()) throw new Error('Departure date cannot be in the past.');
    const next: TravelRequest = { ...request, reference: `TR-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, status: 'PENDING_ADMIN', adminReview: undefined, tmcFulfillment: undefined, approval: { businessJustification: request.approval.businessJustification, requestedBySignature: request.approval.requestedBySignature, requestedDate: today(), excessBaggageAuthorized: false }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await this.database.transaction('rw', this.database.requests, this.database.events, async () => { await this.database.requests.add(next); await this.event(`${next.reference} submitted for approval`, next.id); }); return next;
  }
  async adminApprove(id: string, user: User, approved: boolean, remarks: string) {
    roleRequired(user, 'ADMIN'); if (!remarks.trim()) throw new Error('Admin review remarks are required.');
    return this.database.transaction('rw', this.database.requests, this.database.events, async () => {
      const r=await this.database.requests.get(id); if(!r || r.status!=='PENDING_ADMIN') throw new Error('Only requests awaiting admin review can proceed.');
      const next:TravelRequest={...r,status:approved?'PENDING_APPROVAL':'REJECTED',adminReview:{approved,reviewer:user.employeeName,date:today(),remarks:remarks.trim()},updatedAt:new Date().toISOString()};
      await this.database.requests.put(next); await this.event(r.reference+' admin review completed',id);return next;
    });
  }
  async approve(id: string, user: User, approved: boolean, signature: string, remarks: string, authorized: boolean) {
    roleRequired(user, 'MANAGER'); if (!signature.trim()) throw new Error('A manager signature is required.');
    if (!approved && !remarks.trim()) throw new Error('Please provide a reason for rejection.');
    return this.database.transaction('rw', this.database.requests, this.database.events, async () => {
      const request = await this.database.requests.get(id); if (!request) throw new Error('Request not found.');
      if (request.status !== 'PENDING_APPROVAL') throw new Error('Only pending requests may be approved or rejected.');
      if (request.requestor.approvingManagerId !== user.employeeId || request.requestor.employeeId === user.employeeId) throw new Error('You are not the assigned approving manager.');
      const next: TravelRequest = { ...request, status: approved ? 'APPROVED_FOR_TMC' : 'REJECTED', approval: { ...request.approval, approvedBySignature: signature.trim(), approvedDate: today(), excessBaggageAuthorized: approved && authorized, managerRemarks: remarks.trim() }, updatedAt: new Date().toISOString() };
      await this.database.requests.put(next); await this.event(`${request.reference} ${approved ? 'approved for TMC' : 'rejected'}`, id); return next;
    });
  }
  async issue(id: string, user: User, flightIds: string[], manual?: Partial<TmcFulfillment> & { baseFare?: number; taxesAndFees?: number; baggageFee?: number }) {
    roleRequired(user, 'TMC');
    return this.database.transaction('rw', this.database.requests, this.database.flights, this.database.events, async () => {
      const r = await this.database.requests.get(id); if (!r) throw new Error('Request not found.');
      const entryErrors=validateTicketOverrides(manual??{},r.flightRequirements.excessBaggageKg);if(entryErrors.length)throw new Error(entryErrors[0]);
      if (r.status !== 'APPROVED_FOR_TMC' || !r.approval.approvedBySignature) throw new Error('Manager approval is required before ticket issuance.');
      if (flightIds.length !== r.tripDetails.itineraryLegs.length || new Set(flightIds).size !== flightIds.length) throw new Error('Assign one distinct flight for every itinerary leg.');
      const schedules = await Promise.all(flightIds.map(f => this.database.flights.get(f)));
      let base = 0, taxes = 0, baggage = 0;
      for (let i = 0; i < schedules.length; i++) {
        const f = schedules[i], leg = r.tripDetails.itineraryLegs[i];
        if (!f || f.status === 'CANCELLED') throw new Error('A selected flight is unavailable.');
        if (f.origin !== leg.origin || f.destination !== leg.destination || f.departureTimestamp.slice(0,10) !== leg.date) throw new Error(`Flight does not match itinerary leg ${i + 1}.`);
        if (f.seats[r.flightRequirements.cabinClass] < r.tripDetails.numberOfTravelers) throw new Error('Insufficient seats. Please choose another flight.');
        f.seats[r.flightRequirements.cabinClass] -= r.tripDetails.numberOfTravelers;
        base += f.baseFare * cabinMultiplier[r.flightRequirements.cabinClass] * r.tripDetails.numberOfTravelers;
        taxes += f.taxesAndFees * r.tripDetails.numberOfTravelers;
        baggage += f.baggageRatePerKg * r.flightRequirements.excessBaggageKg * r.tripDetails.numberOfTravelers;
        await this.database.flights.put(f);
      }
      const f = schedules[0]!;
      const pnr = manual?.bookingReferencePnr?.trim() || crypto.randomUUID().replaceAll('-', '').slice(0,6).toUpperCase();
      const ticket = manual?.ticketNumber?.trim() || `079-${Date.now().toString().slice(-10)}`;
      if (!/^[A-Z0-9]{6}$/.test(pnr)) throw new Error('PNR must contain exactly six uppercase letters or digits.');
      const existing = await this.database.requests.toArray();
      if (existing.some(x => x.tmcFulfillment?.bookingReferencePnr === pnr || x.tmcFulfillment?.ticketNumber === ticket)) throw new Error('PNR or ticket number already exists.');
      if (manual?.departureTimestamp && new Date(manual.departureTimestamp).getTime() !== new Date(f.departureTimestamp).getTime()) throw new Error('Departure must match the assigned inventory. Update the schedule first.');
      if (manual?.arrivalTimestamp && new Date(manual.arrivalTimestamp).getTime() !== new Date(schedules.at(-1)!.arrivalTimestamp).getTime()) throw new Error('Arrival must match the assigned inventory.');
      const fulfillment: TmcFulfillment = { tmcTravelConsultant: manual?.tmcTravelConsultant?.trim() || user.employeeName, bookingReferencePnr: pnr, airline: f.airline, flightNumber: schedules.map(x => x!.flightNumber).join(' / '), departureTimestamp: f.departureTimestamp, arrivalTimestamp: schedules.at(-1)!.arrivalTimestamp, ticketNumber: ticket, costsPhp: calculateCosts(manual?.baseFare ?? base, manual?.taxesAndFees ?? taxes, manual?.baggageFee ?? baggage, r.flightRequirements.excessBaggageKg, r.approval.excessBaggageAuthorized), bookingDate: today(), paymentStatus: 'UNBILLED', flightIds };
      if(fulfillment.costsPhp.totalCost>maximumPhp)throw new Error('Total fare exceeds the supported PHP amount.');
      const next: TravelRequest = { ...r, status: 'TICKETED', tmcFulfillment: fulfillment, updatedAt: new Date().toISOString() };
      await this.database.requests.put(next); await this.event(`PNR ${pnr} issued for ${r.requestor.employeeName}`, id); return next;
    });
  }
  async requestRebooking(id: string, user: User) {
    roleRequired(user, 'REQUESTOR'); return this.database.transaction('rw', this.database.requests, this.database.events, async () => {
      const r = await this.database.requests.get(id); if (!r || r.status !== 'TICKETED' || r.requestor.employeeId !== user.employeeId) throw new Error('Only your own ticketed requests can be sent for rebooking.');
      const next: TravelRequest = { ...r, status: 'REBOOKING_REQUESTED', specialRequirements: { ...r.specialRequirements, flightChangeRebookingAssistance: true }, updatedAt: new Date().toISOString() };
      await this.database.requests.put(next); await this.event(`${r.reference} requires rebooking assistance`, id); return next;
    });
  }
  async settle(id: string, user: User) {
    roleRequired(user, 'TMC'); return this.database.transaction('rw', this.database.requests, this.database.events, async () => {
      const r = await this.database.requests.get(id); if (!r?.tmcFulfillment || r.tmcFulfillment.paymentStatus !== 'UNBILLED') throw new Error('This booking cannot be settled.');
      r.tmcFulfillment.paymentStatus = r.tmcFulfillment.costsPhp.employeePayableExcessFee > 0 ? 'SPLIT_SETTLED' : 'COST_CENTER_CHARGED'; r.updatedAt = new Date().toISOString();
      await this.database.requests.put(r); await this.event(`${r.reference} payment reconciled`, id); return r;
    });
  }
  async saveFlight(flight: FlightSchedule, user: User) {
    roleRequired(user, 'TMC');
    if (!flight.airline || !flight.flightNumber.trim() || flight.origin === flight.destination || !Number.isFinite(Date.parse(flight.departureTimestamp)) || !Number.isFinite(Date.parse(flight.arrivalTimestamp)) || Date.parse(flight.arrivalTimestamp) <= Date.parse(flight.departureTimestamp)) throw new Error('Check route, flight number and chronological flight times.');
    for (const key of ['baseFare','taxesAndFees','baggageAllowanceKg','baggageRatePerKg','co2Kg'] as const) if (!Number.isFinite(flight[key]) || flight[key] < 0) throw new Error('Fares and allowances must be non-negative.');
    for (const cabin of ['Economy','Premium Economy','Business'] as const) if (!Number.isInteger(flight.seats[cabin]) || flight.seats[cabin] < 0 || !Number.isInteger(flight.capacity[cabin]) || flight.capacity[cabin] < flight.seats[cabin]) throw new Error('Seat availability must be within cabin capacity.');
    await this.database.transaction('rw', this.database.flights, this.database.requests, this.database.events, async () => {
      const previous = await this.database.flights.get(flight.id);
      const used = (await this.database.requests.toArray()).some(r => r.tmcFulfillment?.flightIds.includes(flight.id));
      if (used && previous && ['origin','destination','departureTimestamp','arrivalTimestamp','airline','flightNumber'].some(k => previous[k as keyof FlightSchedule] !== flight[k as keyof FlightSchedule])) throw new Error('Ticketed schedule identity and times cannot be changed. Create a replacement schedule.');
      if (used && previous) for (const c of ['Economy','Premium Economy','Business'] as const) if (flight.capacity[c] - flight.seats[c] < previous.capacity[c] - previous.seats[c]) throw new Error('Seat changes cannot erase existing reservations.');
      await this.database.flights.put(flight); await this.event(`Schedule ${flight.flightNumber} updated`);
    }); return flight;
  }
  async deleteFlight(id: string, user: User) {
    roleRequired(user, 'TMC'); await this.database.transaction('rw', this.database.flights, this.database.requests, this.database.events, async () => {
      const used = (await this.database.requests.toArray()).some(r => r.tmcFulfillment?.flightIds.includes(id)); if (used) throw new Error('A ticketed flight cannot be deleted. Change its status instead.');
      await this.database.flights.delete(id); await this.event('An unused flight schedule was removed');
    });
  }
}
export const repository = cloudMode ? new CloudRepository() : new TravelRepository();
