import { useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { ISession, IFilm } from "../../interfaces/ISession";
import supabase from "../../supabaseClient";
import { useState, useEffect, useCallback } from "react";
import styles from "../SimpleVoting/index.module.scss";

function EliminationVoting({ session }: { session: ISession }) {
  const { sessionId } = useParams();
  const { userData } = useUser();

  const [chosenFilm, setChosenFilm] = useState<string>("");
  const [sendToResults, setSendToResults] = useState(false);
  const [tiedFilms, setTiedFilms] = useState<IFilm[]>([]);
  const [showTieOptions, setShowTieOptions] = useState(false);

  // derive the films in this round
  const currentFilms = session.current_round_films && session.current_round_films.length
    ? session.current_round_films
    : session.films;

  // initialize current_round_films on first mount
  useEffect(() => {
    if (!session.current_round_films || session.current_round_films.length === 0) {
      supabase
        .from("sessions")
        .update({ current_round_films: session.films })
        .eq("id", sessionId);
    }
  }, [session.films, session.current_round_films, sessionId]);

  // tally votes by title
  const calculateVoteCounts = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {};
    session.users.forEach((user) => {
      Object.keys(user.votes || {}).forEach((title) => {
        counts[title] = (counts[title] || 0) + 1;
      });
    });
    return counts;
  }, [session.users]);

  // find the highest-voted (to eliminate)
  const findMaxVotedFilms = useCallback((voteCounts: Record<string, number>) => {
    const votes = Object.values(voteCounts);
    const maxVotes = votes.length > 0 ? Math.max(...votes) : 0;
    const filmsWithMaxVotes = Object.keys(voteCounts).filter(
      (title) => voteCounts[title] === maxVotes
    );
    return { maxVotes, filmsWithMaxVotes };
  }, []);

  // derived flags
  const allUsersVoted =
    session.users.length > 0 &&
    session.users.every((u) => u.votes && Object.keys(u.votes).length > 0);
  const currUser = session.users.find((u) => u.color === userData.color);
  const currUserVoted = currUser?.votes && Object.keys(currUser.votes).length > 0;
  const isUserInSession = !!currUser;
  const remainingUsers = session.users.filter(
    (u) => !u.votes || Object.keys(u.votes).length === 0
  ).length;

  // auto-detect full-tie when everyone has voted and all films tied
  useEffect(() => {
    if (allUsersVoted) {
      const voteCounts = calculateVoteCounts();
      const { filmsWithMaxVotes } = findMaxVotedFilms(voteCounts);
      const toEliminate = currentFilms.filter(film =>
        filmsWithMaxVotes.includes(film.title)
      );
      // if it would eliminate all remaining films, prompt for tie instead
      if (toEliminate.length === currentFilms.length && currentFilms.length > 1) {
        setTiedFilms(toEliminate);
        setShowTieOptions(true);
      }
    }
  }, [allUsersVoted, calculateVoteCounts, findMaxVotedFilms, currentFilms]);

  // cast a single elimination vote
  const vote = async () => {
    if (!chosenFilm) return;
    const patch = {
      users: session.users.map((user) =>
        user.color === userData.color
          ? { ...user, votes: { ...user.votes, [chosenFilm]: 1 }, ready: true }
          : user
      ),
    };
    const { error } = await supabase
      .from("sessions")
      .update(patch)
      .eq("id", sessionId);

    if (error) console.error("Error casting elimination vote", error);
  };

  // handle elimination or final results
  const handleElimination = async () => {
    const voteCounts = calculateVoteCounts();
    const { filmsWithMaxVotes } = findMaxVotedFilms(voteCounts);
    const toEliminate = currentFilms.filter((f) =>
      filmsWithMaxVotes.includes(f.title)
    );

    // if everyone tied (would eliminate all), show tie options instead of auto-finalizing
    if (toEliminate.length === currentFilms.length) {
      setTiedFilms(toEliminate);
      setShowTieOptions(true);
      return;
    }

    // otherwise remove the top-voted film(s) and start next round
    const nextFilms = currentFilms.filter(
      (f) => !toEliminate.some((el) => el.title === f.title)
    );
    const { error } = await supabase
      .from("sessions")
      .update({
        round: session.round + 1,
        current_round_films: nextFilms,
        users: session.users.map((u) => ({ ...u, votes: {}, ready: false })),
      })
      .eq("id", sessionId);

    if (error) console.error("Error advancing elimination round", error);
    setChosenFilm("");
  };

  // start another tie-breaker round with same films
  const startTieBreakerRound = async () => {
    const { error } = await supabase
      .from("sessions")
      .update({
        users: session.users.map(u => ({ ...u, votes: {}, ready: false })),
        round: session.round + 1,
        current_round_films: tiedFilms
      })
      .eq("id", sessionId);
    if (error) console.error("Error starting tie-breaker round", error);
    setShowTieOptions(false);
    setChosenFilm("");
  };

  // accept multiple winners as tie
  const acceptMultipleWinners = async () => {
    const { error } = await supabase
      .from("sessions")
      .update({
        stage: "result",
        winners: tiedFilms,
        allow_multiple_winners: true
      })
      .eq("id", sessionId);
    if (error) console.error("Error accepting multiple winners", error);
    setSendToResults(true);
  };

  if (sendToResults) {
    return null;
  }

  // before voting
  if (!currUserVoted && isUserInSession) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>round {session.round}</h2>
          <div className={styles.subtitle}>vote to eliminate your <strong>least favorite</strong></div>
          <div className={styles.votingContainer}>
            <ul className={styles.nominationsList}>
              {currentFilms.map((film) => (
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
    );
  }

  // after voting
  return (
    <div className={styles.container}>
      <div className={styles.content}>

        <div className={styles.votingContainer}>
          {!allUsersVoted ? (
            <div># awaiting votes: {remainingUsers}</div>
          ) : (
            <>
              <h3>everyone has voted!</h3>
              <div className={styles.eliminatedFilms}>
                <h3>eliminated:</h3>
                <ul>
                  {currentFilms
                    .filter((f) =>
                      findMaxVotedFilms(calculateVoteCounts()).filmsWithMaxVotes.includes(f.title)
                    )
                    .map((film) => (
                      <li key={film.title} className={styles.eliminatedFilm}>
                        <div className={`${styles.colorBar} ${styles[film.nominated_by]}`} />
                        <span>{film.title}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {isUserInSession && allUsersVoted && (
          <div className={styles.bottomContent}>
            {showTieOptions ? (
              <>
                <div className={styles.tieMessage}>there's a tie!</div>
                <button className={styles.button} onClick={startTieBreakerRound}>
                  start tie-breaker round
                </button>
                <button className={`${styles.button} ${styles.dark}`} onClick={acceptMultipleWinners}>
                  accept multiple winners
                </button>
              </>
            ) : currentFilms.length > 1 ? (
              <button className={styles.button} onClick={handleElimination}>
                next round
              </button>
            ) : (
              <button
                className={`${styles.button} ${styles.dark}`}
                onClick={handleElimination}
              >
                see results
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EliminationVoting;
