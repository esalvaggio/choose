import { useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { ISession } from "../../interfaces/ISession";
import supabase from "../../supabaseClient";
import { useState } from "react";
import styles from "./index.module.scss";

function SimpleVoting({ session }: { session: ISession }) {
// need to prevent voting if you don't pick a color, just put them in the waiting room
  const { sessionId } = useParams();
  const { userData } = useUser();
  const [chosenFilm, setChosenFilm] = useState("");
  const [sendToResults, setSendToResults] = useState(false)

  const vote = async () => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        users: session.users.map((user) =>
          user.color === userData.color
            ? {
              ...user,
              votes: { ...user.votes, [chosenFilm]: 1 },
              ready: true
            }
            : user
        ),
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error voting", updateError);
      return;
    }
  }

  const handleSendToResults = async () => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        stage: "result",
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating session stage", updateError);
      return;
    }
    setSendToResults(true);
  };

  const getRemainingUsers = () => {
    const remainingVotes = session.users.filter((user) =>
      !user.votes || Object.keys(user.votes).length === 0
    );
    return remainingVotes.length;
  };

  const currUserVoted = Object.keys(
    session.users.find((u) => u.color === userData.color)?.votes || {}
  ).length > 0;
  const allUsersVoted = session.users.every((user) =>
    user.votes && Object.keys(user.votes).length > 0
  );

  return sendToResults ? null : !currUserVoted ? (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>this is round: 1</h2>
        <div className={styles.subtitle}>vote for the one you do want</div>
        
        <div className={styles.votingContainer}>
          <ul className={styles.nominationsList}>
            {session.films.map((film) => (
              <li key={film.title}>
                <div className={`${styles.colorBar} ${styles[film.nominated_by]}`} />
                <span className={styles.filmTitle}>{film.title}</span>
                <input
                  type="radio"
                  name="film-choice"
                  checked={chosenFilm === film.title}
                  onChange={() => setChosenFilm(film.title)}
                  className={styles.radioInput}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.bottomContent}>
          <button 
            className={styles.button} 
            onClick={vote} 
            disabled={!chosenFilm}
          >
            submit
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>waiting room</h2>
        
        <div className={styles.votingContainer}>
          {!allUsersVoted ? (
            <div># of people we're waiting on: {getRemainingUsers()}</div>
          ) : (
            <div>everyone has voted</div>
          )}
        </div>

        {allUsersVoted && (
          <div className={styles.bottomContent}>
            <button 
              className={`${styles.button} ${styles.dark}`} 
              onClick={() => handleSendToResults()}
            >
              see results!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimpleVoting;
