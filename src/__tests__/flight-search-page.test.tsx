import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlightSearch } from '../features/flights/FlightSearch';
import { mapCloudFlight } from '../db/flightMapping';
import inventory from './fixtures/supabase-flights.json';
const mocks=vi.hoisted(()=>({useFlights:vi.fn(),refetch:vi.fn()}));
vi.mock('../hooks/useTravel',()=>({useFlights:mocks.useFlights}));
beforeEach(()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-15T04:00:00Z'));
 mocks.refetch.mockResolvedValue({data:inventory.map(mapCloudFlight)});
 mocks.useFlights.mockReturnValue({data:inventory.map(mapCloudFlight),isPending:false,isFetching:false,error:null,refetch:mocks.refetch});
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks();});
const open=()=>render(<MemoryRouter><FlightSearch/></MemoryRouter>);
describe('Find a flight page with seeded Supabase inventory',()=>{
 it('defaults to a stored date and searches with fresh inventory',async()=>{
  open();await waitFor(()=>expect(screen.getByLabelText('Departure')).toHaveValue('2027-02-02'));
  expect(screen.getByText(/DEMO01A/)).toBeInTheDocument();expect(screen.getByText('179 seats available')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Search flights'}));expect(mocks.refetch).toHaveBeenCalledOnce();
  expect(screen.getByRole('combobox',{name:'Sort flights'})).toHaveTextContent('Shortest duration');expect(screen.getByRole('combobox',{name:'Sort flights'})).toHaveTextContent('Lowest CO₂');
 });
 it('preserves explicit dates and explains a real no-schedule result with working date suggestions',async()=>{
  const view=open();fireEvent.change(screen.getByLabelText('Departure'),{target:{value:'2026-11-20'}});
  view.rerender(<MemoryRouter><FlightSearch/></MemoryRouter>);
  expect(screen.getByLabelText('Departure')).toHaveValue('2026-11-20');
  expect(screen.getByRole('heading',{name:'No flights for MNL → CEB'})).toBeInTheDocument();expect(screen.getByText(/No schedule is stored for this date/)).toBeInTheDocument();
  const card=screen.getByRole('heading',{name:'No flights for MNL → CEB'}).closest('.card')!;
  fireEvent.click(within(card as HTMLElement).getByRole('button',{name:'Feb 2, 2027'}));
  expect(screen.getByText(/DEMO01A/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Departure'),{target:{value:''}});expect(screen.getByText(/Choose a departure date/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Search flights'})).toBeDisabled();
 });
 it('does not overwrite a date entered while the initial inventory request is pending',()=>{
  mocks.useFlights.mockReturnValue({data:[],isPending:true,isFetching:true,error:null,refetch:mocks.refetch});
  const view=open();fireEvent.change(screen.getByLabelText('Departure'),{target:{value:'2027-02-04'}});
  mocks.useFlights.mockReturnValue({data:inventory.map(mapCloudFlight),isPending:false,isFetching:false,error:null,refetch:mocks.refetch});
  view.rerender(<MemoryRouter><FlightSearch/></MemoryRouter>);
  expect(screen.getByLabelText('Departure')).toHaveValue('2027-02-04');expect(screen.getByText(/DEMO02A/)).toBeInTheDocument();
 });
 it('applies the fare cap per traveler while displaying the group total',()=>{
  open();fireEvent.change(screen.getByLabelText('Travelers'),{target:{value:'2'}});
  fireEvent.change(screen.getByRole('slider'),{target:{value:'2500'}});
  expect(screen.getByText(/DEMO01A/)).toBeInTheDocument();expect(screen.getByText('Total for 2 travelers')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('slider'),{target:{value:'2000'}});
  expect(screen.getByRole('heading',{name:'No flights for MNL → CEB'})).toBeInTheDocument();expect(screen.getByText(/Schedules exist for this date/)).toBeInTheDocument();
 });
 it('evaluates round-trip dates and time windows independently',()=>{
  open();fireEvent.click(screen.getByRole('button',{name:'Round Trip'}));
  expect(screen.getByLabelText('Departure')).toHaveValue('2027-02-02');expect(screen.getByLabelText('Return')).toHaveValue('2027-02-05');
  fireEvent.change(screen.getByLabelText('Departure from'),{target:{value:'07:00'}});fireEvent.change(screen.getByLabelText('Departure until'),{target:{value:'09:00'}});
  expect(screen.getAllByRole('button',{name:/Select this flight/})).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Return from'),{target:{value:'18:00'}});
  expect(screen.getByText(/DEMO01A/)).toBeInTheDocument();expect(screen.getByRole('heading',{name:'No flights for CEB → MNL'})).toBeInTheDocument();
 });
 it('evaluates each multi-city leg and preserves unrelated legs when a date changes',()=>{
  open();fireEvent.click(screen.getByRole('button',{name:'Multi-City'}));
  expect(screen.getAllByLabelText('Departure').map(input=>(input as HTMLInputElement).value)).toEqual(['2027-02-02','2027-02-05']);
  fireEvent.change(screen.getAllByLabelText('Departure')[1],{target:{value:'2027-02-06'}});
  expect(screen.getByText(/DEMO01A/)).toBeInTheDocument();expect(screen.getByText(/DEMO01B/)).toBeInTheDocument();expect(screen.getByText(/DEMO02B/)).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/Select this flight/})).toHaveLength(3);
 });
});
