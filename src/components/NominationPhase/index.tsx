import { useState } from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { ISession, IFilm } from "../../interfaces/ISession";
import supabase from "../../supabaseClient";
import styles from './index.module.scss';
import { UserColorBar } from "../UserColorBar/index";

function NominationPhase({ session }: { session: ISession }) {
  const { sessionId } = useParams();
  const { userData } = useUser();
  const [newFilm, setNewFilm] = useState("");
  const [setToVote, setSendToVote] = useState(false);
  const isAdmin = userData.color === session.admin_color;

  const nominateFilm = async (title: string) => {
    const remainingNoms = getRemainingNoms();
    if (remainingNoms <= 0) {
      alert("You've reached your nomination limit!");
      return false;
    }

    const duplicateFilm = session.films.find(film =>
      film.title.toLowerCase() === title.toLowerCase()
    );

    if (duplicateFilm) {
      if (duplicateFilm.nominated_by === userData.color) {
        alert("you already nominated this silly");
      } else {
        alert("someone else already nominated this lol");
      }
      return false;
    }

    const newFilm = {
      title,
      nominated_by: userData.color,
      eliminated: false,
    };

    const { error } = await supabase.rpc('append_film_to_session', {
      p_session_id: sessionId,
      p_film: newFilm
    });

    if (error) {
      console.error("Error adding nomination:", error);
      alert("Failed to add nomination");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFilm.trim()) {
      const success = await nominateFilm(newFilm.trim());
      if (success) {
        setNewFilm("");
      }
    }
  };

  const deleteNomination = async (filmToDelete: IFilm) => {
    const { error } = await supabase.rpc('remove_film_from_session', {
      p_session_id: sessionId,
      p_film: filmToDelete
    });

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
    const { error: updateError } = await supabase.rpc('set_user_ready_status', {
      p_session_id: sessionId,
      p_user_color: userData.color,
      p_is_ready: true
    });
    
    if (updateError) {
      console.error("Error updating user ready status", updateError);
      return;
    }
  };

  const handleSendToVote = async () => {
    // Check if there are any nominations
    if (session.films.length === 0) {
      alert("There are no nominations to vote on. At least one nomination is required.");
      return;
    }

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        stage: "vote",
        current_round_films: session.films, // Ensure films are set for voting
      })
      .eq("id", sessionId);
    if (updateError) {
      console.error("Error updating session stage", updateError);
      return;
    }
    setSendToVote(true);
  };

  const handleReturnToNominations = async () => {
    const { error: updateError } = await supabase.rpc('reset_all_users_ready', {
      p_session_id: sessionId
    });
    
    if (updateError) {
      console.error("Error resetting nomination phase", updateError);
      return;
    }
  };

  const currUserReady = !userData.color || session.users.find(
    (u) => u.color === userData.color,
  )?.ready;
  const allUsersReady = session.users.every((user) => user.ready);
  return setToVote ? null : !currUserReady ? (
    <div className={styles.container}>
      <UserColorBar colors={userData.color ? [userData.color] : []} />
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

        <div className={styles.nominationsContainer}>
          <div className={styles.remainingNoms}>
            # of remaining nominations: {remainingNoms}
          </div>

          <div>your nominations so far:</div>
          <ul className={styles.nominationsList}>
            {session.films
              .filter((film) => film.nominated_by === userData.color)
              .map((film) => (
                <li key={`${film.nominated_by}-${film.title}`}>
                  {film.title}
                  <button className={styles.deleteButton} onClick={() => deleteNomination(film)}>×</button>
                </li>
              ))}
          </ul>
        </div>

        <div className={styles.bottomContent}>
          <button className={styles.button} onClick={() => handleDone()}>
            i'm done
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className={styles.container}>
      <UserColorBar colors={userData.color ? [userData.color] : []} />
      <div className={styles.content}>
        <h2 className={styles.title}>waiting room</h2>

        <div className={styles.waitingRoom}>
          {!allUsersReady ? (
            <div># of people we're waiting on: {getRemainingUsers()}</div>
          ) : (
            <div>these are your noms:</div>
          )}
          {/* Admin can delete nominations in this view */}
          <ul className={styles.nominationsList}>
            {session.films.map((film) => (
              <li key={film.title}>
                <div className={`${styles.colorBar} ${styles[film.nominated_by]}`} />
                <span style={!allUsersReady ? { filter: "blur(5px)" } : undefined}>
                  {film.title}
                </span>
                {isAdmin && allUsersReady && (
                  <button className={styles.deleteButton} onClick={() => deleteNomination(film)}>×</button>
                )}
              </li>
            ))}
          </ul>
          {session.films.length === 0 && allUsersReady && (
            <div className={styles.noNominationsMessage}>
              nobody nominated anything!! go back and nominate something silly
            </div>
          )}
        </div>

        {allUsersReady && (
          <div className={styles.bottomContent}>
            {session.films.length === 0 ? (
              <button
                className={`${styles.button}`}
                onClick={() => handleReturnToNominations()}
              >
                return to nominations
              </button>
            ) : isAdmin ? (
              <button
                className={`${styles.button}`}
                onClick={() => handleSendToVote()}
              >
                we're all ready to vote!
              </button>
            ) : (
              <div className={styles.waitingForAdmin}>
                waiting for the admin to start voting...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NominationPhase;
