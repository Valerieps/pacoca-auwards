import { useEffect, useState, type FormEvent } from 'react';
import type { ApiError, EditionView } from '../../application/api-contract';
import { toBrasiliaLocal } from '../../domain/award/brasilia';
import { hasEnded, hasStarted, phaseNumber, PHASES, startablePhase, TIMED_PHASES, type Phase } from '../../domain/award/phases';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { useQuery } from '../use-query';

interface Draft {
  startsAt: Record<string, string>;
  endsAt: Record<string, string>;
}

function draftOf(edition: EditionView): Draft {
  const local = (dates: Partial<Record<string, string>>) =>
    Object.fromEntries(Object.entries(dates).map(([phase, at]) => [phase, at ? toBrasiliaLocal(at) : '']));
  return { startsAt: local(edition.startsAt), endsAt: local(edition.endsAt) };
}

/** The draft as the command takes it: an empty field is no date. */
function datesOf(phases: readonly Phase[], dates: Record<string, string>): Record<string, string | null> {
  return Object.fromEntries(phases.map((phase) => [phase, dates[phase] || null]));
}

function errorText(error: ApiError): string {
  if (error === 'invalid') return strings.calendar.invalid;
  if (error === 'forbidden') return strings.forbidden;
  return strings.genericError;
}

function title(phase: Phase): string {
  return strings.phaseTitle(phaseNumber(phase), strings.phases[phase]);
}

/** Organizador only: when each phase starts and ends, in Brasília time (docs/spec/premiacao.md). */
export function Calendar() {
  const { backend } = useServices();
  const edition = useQuery('edition', {}, ['edition']);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // The form starts from the saved calendar.
  useEffect(() => {
    if (edition.data && draft === null) setDraft(draftOf(edition.data));
  }, [edition.data, draft]);

  if (!edition.data || !draft) return null;
  const state = edition.data;
  const startable = startablePhase(state);

  function done(result: { ok: true; value: EditionView } | { ok: false; error: ApiError }, saved: string) {
    if (result.ok) setDraft(draftOf(result.value));
    setMessage(result.ok ? { text: saved, error: false } : { text: errorText(result.error), error: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    const result = await backend.command('edition.setCalendar', {
      startsAt: datesOf(PHASES, draft.startsAt),
      endsAt: datesOf(TIMED_PHASES, draft.endsAt),
    });
    setBusy(false);
    done(result, strings.calendar.saved);
  }

  async function startNow(phase: Phase) {
    if (!window.confirm(strings.calendar.startNowConfirm(title(phase)))) return;
    setBusy(true);
    const result = await backend.command('edition.startPhase', { phase });
    setBusy(false);
    done(result, strings.calendar.started(title(phase)));
  }

  const field = (side: keyof Draft, phase: Phase, label: string, happened: boolean) => (
    <label>
      <span className="muted">{label}</span>
      <input
        type="datetime-local"
        value={draft[side][phase] ?? ''}
        disabled={happened}
        onChange={(e) => setDraft({ ...draft, [side]: { ...draft[side], [phase]: e.target.value } })}
      />
    </label>
  );

  return (
    <section>
      <h1>{strings.calendar.title}</h1>
      <p className="muted">
        {state.name}. {strings.calendar.intro}
      </p>
      <form className="stack" onSubmit={submit}>
        {PHASES.map((phase) => {
          const ended = hasEnded(phase, state);
          return (
            <fieldset key={phase} className="card stack">
              <legend>
                <strong>{title(phase)}</strong>
              </legend>
              {field('startsAt', phase, strings.calendar.start, hasStarted(phase, state))}
              {phase !== 'announcement' && field('endsAt', phase, strings.calendar.end, ended)}
              {ended && <span className="muted">{strings.calendar.ended}</span>}
              {phase === startable && (
                <button type="button" className="secondary" disabled={busy} onClick={() => startNow(phase)}>
                  {strings.calendar.startNow}
                </button>
              )}
            </fieldset>
          );
        })}
        <button type="submit" disabled={busy}>
          {strings.calendar.save}
        </button>
      </form>
      {message && (
        <p className="notice" role={message.error ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </section>
  );
}
