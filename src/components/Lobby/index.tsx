import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./index.module.scss";
import supabase from "../../supabaseClient";

export default function Lobby() {
  const navigate = useNavigate();
  const [gameId, setGameId] = useState("");
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [wordList, setWordList] = useState<string[]>([]);
  const [validatedSessionId, setValidatedSessionId] = useState<string | null>(null);

  // load word list
  useEffect(() => {
    fetch('/wordList.txt')
      .then(response => response.text())
      .then(text => {
        const words = text.split('\n').filter(word => word.trim() !== '');
        setWordList(words);
      })
      .catch(error => {
        console.error('Error loading word list:', error);
        setWordList(['apple', 'banana', 'cherry', 'dolphin', 'elephant']);
      });
  }, []);

  // generate and validate a session ID in the background
  useEffect(() => {
    if (wordList.length > 0 && !validatedSessionId && !isValidating) {
      validateSessionId();
    }
  }, [wordList, validatedSessionId, isValidating]);

  const generateRandomSessionId = () => {
    if (wordList.length === 0) {
      return `session-${Date.now()}`;
    }
    const firstWord = wordList[Math.floor(Math.random() * wordList.length)];
    const secondWord = wordList[Math.floor(Math.random() * wordList.length)];
    return `${firstWord}-${secondWord}`;
  };

  const validateSessionId = async () => {
    setIsValidating(true);
    let sessionId = generateRandomSessionId();

    try {
      const { error } = await supabase
        .from("sessions")
        .select("id")
        .eq("id", sessionId)
        .single();

      if (error && error.code === "PGRST116") {
        setValidatedSessionId(sessionId);
      } else if (!error) {
        sessionId = `${generateRandomSessionId()}-${Date.now()}`;
        setValidatedSessionId(sessionId);
      } else {
        console.error("Error checking session:", error);
        sessionId = `${sessionId}-${Date.now()}`;
        setValidatedSessionId(sessionId);
      }
    } catch (e) {
      console.error("Error validating session:", e);
      setValidatedSessionId(`${generateRandomSessionId()}-${Date.now()}`);
    }

    setIsValidating(false);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (gameId) {
      setIsJoiningSession(true);
      navigate(gameId);
    }
  };

  const createNewSession = async () => {
    if (validatedSessionId) {
      const sessionToUse = validatedSessionId;
      setValidatedSessionId(null);
      navigate(sessionToUse);
    } else if (isValidating) {
      // If we're still validating, manually create one now
      const tempSessionId = `${generateRandomSessionId()}-${Date.now()}`;
      navigate(tempSessionId);
    } else {
      // No validated ID and not currently validating
      // This could happen if the component just mounted, quickly validate one now
      setIsValidating(true);

      // Generate and check a session ID
      let sessionId = generateRandomSessionId();
      try {
        const { error } = await supabase
          .from("sessions")
          .select("id")
          .eq("id", sessionId)
          .single();

        if (error && error.code === "PGRST116") {
          // Session doesn't exist, good to go
          navigate(sessionId);
        } else {
          // Use a fallback with timestamp to ensure uniqueness
          navigate(`${generateRandomSessionId()}-${Date.now()}`);
        }
      } catch (e) {
        // If there's any error, use a fallback ID
        navigate(`${generateRandomSessionId()}-${Date.now()}`);
      }

      setIsValidating(false);
    }
  };

  return (
    <div className={styles.mainContainer}>
      <div className={styles.topSection}>
        <span className={styles.title}>choose</span>
      </div>

      <div className={styles.bottomSection}>
        <button
          className={`${styles.button} ${styles.primary}`}
          onClick={createNewSession}
        >
          start new session
        </button>
        <span className={styles.or}>or</span>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={"enter session code..."}
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            disabled={isJoiningSession}
          />
          <button className={`${styles.button} ${styles.dark}`} type="submit" disabled={isJoiningSession || !gameId}>
            {isJoiningSession ? "joining..." : "start with code"}
          </button>
        </form>
      </div>
    </div>
  );
}
