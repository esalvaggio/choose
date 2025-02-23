import { useState } from "react";
import { useNavigate } from "react-router-dom";
export default function Lobby() {
  const navigate = useNavigate();
  const adjectives = ["blue", "red", "happy", "swift"];
  const nouns = ["dolphin", "penguin", "turtle", "panda"];
  const sessionId = `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}`;
  const [gameId, setGameId] = useState(sessionId);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (gameId) {
      navigate(gameId);
    }
  };
  return (
    <>
      <div>Lobby</div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder={sessionId}
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        />
        <button type="submit">Go</button>
      </form>
    </>
  );
}
