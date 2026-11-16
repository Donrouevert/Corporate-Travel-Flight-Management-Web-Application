import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Clock3 } from 'lucide-react';

interface Props {
  label: 'Departure' | 'Return';
  from: string;
  until: string;
  onChange: (from: string, until: string) => void;
}
const pad = (n: number) => String(n).padStart(2, '0');

export function FlightTimeRangePicker({ label, from, until, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<'from' | 'until'>('from');
  const [draft, setDraft] = useState({ from, until });
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = draft[active];
  const invalid = !!draft.from && !!draft.until && draft.until < draft.from;
  const begin = (field: 'from' | 'until') => { setDraft({ from, until }); setActive(field); };
  const pick = (part: 'hour' | 'minute', value: string) => {
    const hour = part === 'hour' ? value : current.split(':')[0] || '00';
    const minute = part === 'minute' ? value : current.split(':')[1] || '00';
    setDraft(old => ({ ...old, [active]: hour + ':' + minute }));
  };
  const move = (event: KeyboardEvent<HTMLButtonElement>, part: string, value: number, count: number) => {
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4, Home: -value, End: count - value - 1 };
    if (!(event.key in deltas)) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(count - 1, value + deltas[event.key]));
    grid.current?.querySelector<HTMLButtonElement>('[data-time-part="' + part + '"][data-time-value="' + next + '"]')?.focus();
  };
  return <Popover.Root open={open} onOpenChange={setOpen}>
    <fieldset className="flight-time-range"><legend>{label} window <span>· PHT</span></legend><div className="time-range-triggers">
      {(['from', 'until'] as const).map(field => <Popover.Trigger key={field} className={'time-trigger ' + (open && active === field ? 'is-active' : '')} aria-label={label + ' ' + field + ': ' + ((field === 'from' ? from : until) || 'Any time')} onClick={() => begin(field)}>
        <span><b>{field === 'from' ? 'From' : 'Until'}</b><span>{(field === 'from' ? from : until) || 'Any time'}</span></span><Clock3 size={17}/>
      </Popover.Trigger>)}
    </div></fieldset>
    <Popover.Portal><Popover.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={12} className="flight-time-positioner">
      <Popover.Popup className="flight-time-popup">
        <header className="time-popup-heading"><Popover.Title>{label} time</Popover.Title><Popover.Description>Philippine Standard Time · 24-hour clock</Popover.Description></header>
        <div className="calendar-fields time-popup-fields">{(['from', 'until'] as const).map(field => <button type="button" key={field} className={'date-trigger ' + (active === field ? 'is-active' : '')} aria-label={(field === 'from' ? 'From ' : 'Until ') + (draft[field] || 'Any time')} aria-pressed={active === field} onClick={() => setActive(field)}><span><b>{field === 'from' ? 'From' : 'Until'}</b><span>{draft[field] || 'Any time'}</span></span><Clock3 size={17}/></button>)}</div>
        <div className="time-choice-grid" ref={grid}>{(['hour', 'minute'] as const).map((part, index) => <section key={part} aria-labelledby={id + part}><h3 id={id + part}>{part === 'hour' ? 'Hour' : 'Minute'}</h3><div className="time-choice-scroll" role="group" aria-label={part === 'hour' ? 'Hours' : 'Minutes'}>{Array.from({ length: part === 'hour' ? 24 : 60 }, (_, n) => <button type="button" key={n} data-time-part={part} data-time-value={n} aria-label={part + ' ' + pad(n)} aria-pressed={!!current && current.split(':')[index] === pad(n)} onClick={() => pick(part, pad(n))} onKeyDown={e => move(e, part, n, part === 'hour' ? 24 : 60)}>{pad(n)}</button>)}</div></section>)}</div>
        <div className="time-popup-hint" aria-live="polite">{invalid ? <p role="alert">Until must be on or after From.</p> : <p>Select a time for <b>{active === 'from' ? 'From' : 'Until'}</b>. Leave either boundary open for flexibility.</p>}</div>
        <footer className="flight-picker-actions"><button type="button" onClick={() => { setDraft({ from: '', until: '' }); setActive('from'); }}>CLEAR</button><button type="button" className="calendar-done" disabled={invalid} onClick={() => { onChange(draft.from, draft.until); setOpen(false); }}>DONE</button></footer>
      </Popover.Popup>
    </Popover.Positioner></Popover.Portal>
  </Popover.Root>;
}
