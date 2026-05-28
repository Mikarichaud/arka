import ProvenanceBadge from '../ProvenanceBadge/ProvenanceBadge';
import './PlayerCard.css';

export default function PlayerCard({ player, isActive = false, rank, postalCode, pirate = false }) {
  return (
    <div className={`player-card ${isActive ? 'player-card--active' : ''}`}>
      <div className="player-avatar">
        {player.avatar
          ? <img src={player.avatar} alt={player.name} />
          : <span>{player.name.charAt(0).toUpperCase()}</span>
        }
        {rank && <span className="player-rank">#{rank}</span>}
      </div>
      <div className="player-info">
        <span className="player-name">
          {player.name}
          {(postalCode || pirate) && (
            <ProvenanceBadge postalCode={postalCode} pirate={pirate} variant="icon" size={16} />
          )}
        </span>
        {isActive && <span className="player-turn">À toi de jouer !</span>}
      </div>
      <span className="player-score">{player.score} pts</span>
    </div>
  );
}
