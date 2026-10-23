import { useEffect, useState, type FormEvent } from 'react';
import type { EditionView, MeView } from '../../application/api-contract';
import { formatBrasilia, timeLeft } from '../../domain/award/brasilia';
import { nextPhase, phaseNumber, type Phase } from '../../domain/award/phases';
import { NAME_MAX_LENGTH } from '../../domain/group/profile';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { useQuery } from '../use-query';

/** The start screen: the edition's phase and how long it has left (docs/spec/premiacao.md), and my name. */
export function Home({ me }: { me: MeView }) {
  const edition = useQuery('edition', {}, ['edition']);
  return (
    <section>
      <h1>{strings.home.hello(me.name)}</h1>
      {edition.data && <EditionCard edition={edition.data} />}
      <RenameForm me={me} />
    </section>
  );
}

function phaseTitle(phase: Phase): string {
  return strings.phaseTitle(phaseNumber(phase), strings.phases[phase]);
}

/** Re-renders every minute, so the countdown moves on its own. */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function EditionCard({ edition }: { edition: EditionView }) {
  const now = useMinute();
  const next = nextPhase(edition.phase);
  if (edition.ended && next) {
    // The break between two phases: the next one always has a start, or it would have started.
    const start = edition.startsAt[next];
    return (
      <div className="card stack">
        <span className="muted">{edition.name}</span>
        <strong>{strings.home.phaseEnded(phaseTitle(edition.phase))}</strong>
        <span>{start ? strings.home.nextStartsAt(phaseTitle(next), formatBrasilia(start)) : strings.home.starting}</span>
      </div>
    );
  }
  const end = edition.phase === 'announcement' ? undefined : edition.endsAt[edition.phase];
  const left = end ? timeLeft(end, now) : null;
  return (
    <div className="card stack">
      <span className="muted">{edition.name}</span>
      <strong>{phaseTitle(edition.phase)}</strong>
      {end ? (
        <>
          <span>{left ? strings.home.timeLeft(left) : strings.home.ending}</span>
          <span className="muted">{strings.home.endsAt(formatBrasilia(end))}</span>
        </>
      ) : (
        edition.phase !== 'announcement' && <span className="muted">{strings.home.noEnd}</span>
      )}
    </div>
  );
}

function RenameForm({ me }: { me: MeView }) {
  const { backend } = useServices();
  const [name, setName] = useState(me.name);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await backend.command('member.rename', { name });
    setError(result.ok ? null : strings.genericError);
  }

  return (
    <>
      <form className="row" onSubmit={submit}>
        <label className="grow">
          <span className="muted">{strings.home.nameLabel}</span>
          <input required maxLength={NAME_MAX_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit">{strings.home.save}</button>
      </form>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
