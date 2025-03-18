import { useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { ISession } from "../interfaces/ISession";
import supabase from "../supabaseClient";
import styles from './NominationPhase.module.scss';

function NominationPhase({ session }: { session: ISession }) {
  const { sessionId } = useParams();
  const { userData } = useUser();
  const [newFilm, setNewFilm] = useState("");
  const [setToVote, setSendToVote] = useState(false);

  const nominateFilm = async (title: string) => {
    const remainingNoms = getRemainingNoms();
    if (remainingNoms <= 0) {
      alert("You've reached your nomination limit!");
      return;
    }
    const newFilm = {
      title,
      nominated_by: userData.color,
      eliminated: false,
    };

    await supabase
      .from("sessions")
      .update({
        films: [...session.films, newFilm],
      })
      .eq("id", sessionId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFilm.trim()) {
      nominateFilm(newFilm.trim());
      setNewFilm("");
    }
  };

  const deleteNomination = async (titleToDelete: string) => {
    const updatedFilms = session.films.filter(
      (film) => film.title !== titleToDelete,
    );

    const { error } = await supabase
      .from("sessions")
      .update({
        films: updatedFilms,
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting nomination:", error);
      alert("Failed to delete nomination");
    }
  };

  const getRemainingNoms = () => {
    const allowed_noms = session.allowed_noms;
    const userNominations = session.films.filter(
      (film) => film.nominated_by === userData.color,
    );
    return allowed_noms - userNominations.length;
  };
  const remainingNoms = getRemainingNoms();

  const getRemainingUsers = () => {
    const remainingNoms = session.users.filter((user) => user.ready === false);
    return remainingNoms.length;
  };

  const handleDone = async () => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        users: session.users.map((user) =>
          user.color === userData.color ? { ...user, ready: true } : user,
        ),
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating user ready status", updateError);
      return;
    }
  };

  const handleSendToVote = async () => {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        stage: "vote",
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating session stage", updateError);
      return;
    }
    setSendToVote(true);
  };

  const currUserReady = !userData.color || session.users.find(
    (u) => u.color === userData.color,
  )?.ready;
  const allUsersReady = session.users.every((user) => user.ready);
  return setToVote ? null : !currUserReady ? (
    <div className={styles.container}>
      <div className={`${styles.userColorBar} ${styles[userData.color || '']}`} />
      <div className={styles.content}>
        <h2 className={styles.title}>nominate something</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={newFilm}
            onChange={(e) => setNewFilm(e.target.value)}
            placeholder="enter nomination..."
            disabled={remainingNoms <= 0}
          />
          <button className={styles.button} disabled={remainingNoms <= 0} type="submit">
            submit
          </button>
        </form>

        <div className={styles.remainingNoms}>
          # of remaining nominations: {remainingNoms}
        </div>

        <div>your nominations so far:</div>
        <ul className={styles.nominationsList}>
          {session.films
            .filter((film) => film.nominated_by === userData.color)
            .map((film) => (
              <li key={film.title}>
                {film.title}
                <button className={styles.deleteButton} onClick={() => deleteNomination(film.title)}>×</button>
              </li>
            ))}
        </ul>

        <div className={styles.bottomContent}>
          <button className={styles.button + ' ' + styles.dark} onClick={() => handleDone()}>
            i'm done
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className={`${styles.container} ${styles.waitingRoom}`}>
      <div className={`${styles.userColorBar} ${styles[userData.color || '']}`} />
      <div className={styles.content}>
        <h2 className={styles.title}>waiting room</h2>
        {!allUsersReady ? (
          <div># of people we're waiting on: {getRemainingUsers()}</div>
        ) : (
          <div>these are your noms</div>
        )}
        <ul className={styles.nominationsList}>
          {session.films.map((film) => (
            <li key={film.title}>
              {film.nominated_by} -{" "}
              <span style={!allUsersReady ? { filter: "blur(5px)" } : undefined}>
                {film.title}
              </span>
            </li>
          ))}
        </ul>
        {allUsersReady && (
          <button className={`${styles.button} ${styles.dark}`} onClick={() => handleSendToVote()}>
            we're all ready to vote!
          </button>
        )}
      </div>
    </div>
  );
}

export default NominationPhase;
