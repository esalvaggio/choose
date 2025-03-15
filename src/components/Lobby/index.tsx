import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.scss";

export default function Lobby() {
  const navigate = useNavigate();
  const adjectives = ["blue", "red", "happy", "swift"];
  const nouns = ["dolphin", "penguin", "turtle", "panda"];
  const sessionId = `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${nouns[Math.floor(Math.random() * nouns.length)]}`;
  const [gameId, setGameId] = useState("");

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (gameId) {
      navigate(gameId);
    }
  };
  
  return (
    <div className={styles.mainContainer}>
        <div className={styles.topSection}>
            <span className={styles.title}>choose</span>
        </div>
        
        <div className={styles.bottomSection}>
            <span className={styles.subtitle}>join an existing session</span>
            <form className={styles.form} onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder={"enter session code..."}
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                />
                <button className={styles.button} type="submit">join</button>
            </form>
            <span className={styles.or}>or</span>
            <button className={`${styles.button} ${styles.create}`} onClick={() => navigate(sessionId)}>
                create a new session
            </button>
        </div>
    </div>
  );
}
