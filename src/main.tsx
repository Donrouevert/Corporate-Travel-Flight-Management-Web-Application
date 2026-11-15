import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { AppShell } from './components/layout/AppShell';
import { RoleDashboard } from './features/dashboard/RoleDashboard';
import { FlightStatus } from './features/flights/FlightStatus';
import { useAuth } from './contexts/AuthContext';
import { cloudMode } from './lib/supabase';
import type { Role } from './types/travel';
import { FlightSearch } from './features/flights/FlightSearch';
import { BookingWizard } from './features/bookings/BookingWizard';
import { Bookings } from './features/bookings/Bookings';
import { RequestDetail } from './features/bookings/RequestDetail';
import { FlightAdmin } from './features/admin/FlightAdmin';
import { Payments } from './features/payments/Payments';
import { seedDatabase } from './db/seed';
import './index.css';
const query = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: true }, mutations: { retry: false } } });
class ErrorBoundary extends Component<{children:ReactNode},{error:Error|null}> {
  state={error:null as Error|null};
  static getDerivedStateFromError(error:Error){return {error};}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Travel workspace error',error,info.componentStack);}
  render(){if(this.state.error)return <div className="startup-error"><h1>Your workspace needs a refresh</h1><p>{this.state.error.message}</p><button className="btn btn-primary" onClick={()=>window.location.reload()}>Reload workspace</button></div>;return this.props.children;}
}
function RoleGate({roles,children}:{roles:Role[];children:ReactNode}){const {user}=useAuth();return roles.includes(user.role)?children:<Navigate to="/dashboard" replace/>;}
async function start() {
  const root=ReactDOM.createRoot(document.getElementById('root')!);
  try { if(!cloudMode)await seedDatabase(); root.render(<React.StrictMode><ErrorBoundary><QueryClientProvider client={query}><AuthProvider><SocketProvider><BrowserRouter><Routes><Route element={<AppShell/>}><Route path="/dashboard" element={<RoleDashboard/>}/><Route path="/flight-status" element={<FlightStatus/>}/><Route path="/flights/search" element={<FlightSearch/>}/><Route path="/bookings/new" element={<BookingWizard/>}/><Route path="/bookings" element={<Bookings/>}/><Route path="/bookings/:id" element={<RequestDetail/>}/><Route path="/admin/flights" element={<RoleGate roles={["TMC"]}><FlightAdmin/></RoleGate>}/><Route path="/payments" element={<RoleGate roles={["TMC"]}><Payments/></RoleGate>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Route></Routes></BrowserRouter><Toaster position="top-right" richColors/></SocketProvider></AuthProvider></QueryClientProvider></ErrorBoundary></React.StrictMode>); }
  catch(error){root.render(<div className="startup-error"><h1>Browser storage is unavailable</h1><p>{error instanceof Error?error.message:'Please enable IndexedDB for this site, then reload.'}</p><button className="btn btn-primary" onClick={()=>window.location.reload()}>Try again</button></div>);}
}
void start();
