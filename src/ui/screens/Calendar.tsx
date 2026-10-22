import { useEffect, useState, type FormEvent } from 'react';
import type { ApiError, EditionView } from '../../application/api-contract';
import { toBrasiliaLocal } from '../../domain/award/brasilia';
import { hasEnded, phaseNumber, TIMED_PHASES, type TimedPhase } from '../../domain/award/phases';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { useQuery } from '../use-query';

type Draft = Record<TimedPhase, string>;

function draftOf(edition: EditionView): Draft {
  const local = (phase: TimedPhase) => {
    const end = edition.endsAt[phase];
    return end ? toBrasiliaLocal(end) : '';
  };
  return { collection: local('collection'), registration: local('registration'), open: local('open'), voting: local('voting') };
}

function errorText(error: ApiError): string {
  if (error === 'invalid') return strings.calendar.invalid;
  if (error === 'forbidden') return strings.forbidden;
  return strings.genericError;
}

/** Organizador only: when each phase ends, in Brasília time (docs/spec/premiacao.md). */
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
  const current = edition.data.phase;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    const endsAt = Object.fromEntries(TIMED_PHASES.map((phase) => [phase, draft[phase] || null]));
    const result = await backend.command('edition.setCalendar', { endsAt });
    setBusy(false);
    if (result.ok) setDraft(draftOf(result.value));
    setMessage(result.ok ? { text: strings.calendar.saved, error: false } : { text: errorText(result.error), error: true });
  }

  return (
    <section>
      <h1>{strings.calendar.title}</h1>
      <p className="muted">
        {edition.data.name}. {strings.calendar.intro}
      </p>
      <form className="stack" onSubmit={submit}>
        {TIMED_PHASES.map((phase) => {
          const ended = hasEnded(phase, current);
          return (
            <label key={phase}>
              <span className="muted">{strings.calendar.endOf(strings.phaseTitle(phaseNumber(phase), strings.phases[phase]))}</span>
              <input
                type="datetime-local"
                value={draft[phase]}
                disabled={ended}
                onChange={(e) => setDraft({ ...draft, [phase]: e.target.value })}
              />
              {ended && <span className="muted">{strings.calendar.ended}</span>}
            </label>
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
