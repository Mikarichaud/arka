import './PlayerCard.css';

export default function PlayerCard({ player, isActive = false, rank }) {
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
        <span className="player-name">{player.name}</span>
        {isActive && <span className="player-turn">À toi de jouer !</span>}
      </div>
      <span className="player-score">{player.score} pts</span>
    </div>
  );
}
