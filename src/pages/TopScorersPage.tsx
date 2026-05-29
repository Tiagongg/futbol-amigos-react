import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { FormatToggle } from '../components/FormatToggle';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { useTeam } from '../context/TeamContext';
import type { MatchFormat } from '../types/models';

export function TopScorersPage() {
  const team = useTeam();
  const [format, setFormat] = useState<MatchFormat>(team.matchFormat);
  const standings = team.getGoalScorerStandings(format);
  const finalized = team.finalizedMatchesCount(format);

  return (
    <AppShell
      title="Goleadores"
      subtitle={`${finalized} partidos finalizados`}
      backTo="/matches"
    >
      <FormatToggle value={format} onChange={setFormat} />

      {standings.length === 0 ? (
        <p className="hint center">
          Todavía no hay goles en partidos finalizados de este formato.
        </p>
      ) : (
        <ol className="scorer-list">
          {standings.map((s, i) => (
            <li key={s.playerId}>
              <span className="rank">{i + 1}</span>
              <Link to={`/scorers/${format}/${s.playerId}`} className="scorer-link">
                <PlayerAvatar name={s.name} imageUri={s.imageUri} />
                <div className="scorer-info">
                  <strong className="scorer-name">{s.name}</strong>
                  <span className="meta scorer-stats">
                    {s.totalGoals} goles · {s.matchesPlayed} partidos
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </AppShell>
  );
}
