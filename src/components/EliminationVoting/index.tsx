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
  const [isLoading, setIsLoading] = useState(false);

  // Local state for films in the current round
  const [filmsInRound, setFilmsInRound] = useState<IFilm[]>(
    session.current_round_films && session.current_round_films.length
      ? session.current_round_films
      : session.films
  );

  // Update local state when session.current_round_films changes
  useEffect(() => {
    if (session.current_round_films && session.current_round_films.length > 0) {
      setFilmsInRound(session.current_round_films);
    }
  }, [session.current_round_films]);

  // Initialize current_round_films on first mount
  useEffect(() => {
    const initializeRoundFilms = async () => {
      if (!session.current_round_films || session.current_round_films.length === 0) {
        const { error } = await supabase
          .from("sessions")
          .update({ current_round_films: session.films })
          .eq("id", sessionId);

        if (!error) {
          setFilmsInRound(session.films);
        } else {
          console.error("Error initializing round films:", error);
        }
      }
    };
    initializeRoundFilms();
  }, [session.films, session.current_round_films, sessionId]);

  // Auto-finalize when only one film remains
  useEffect(() => {
    const handleSingleFilm = async () => {
      if (filmsInRound.length === 1 && !sendToResults && !isLoading) {
        await acceptSingleWinner(filmsInRound);
      }
    };
    handleSingleFilm();
  }, [filmsInRound, sendToResults, isLoading]);

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

  // Detect ties when all users have voted
  useEffect(() => {
    if (allUsersVoted && filmsInRound.length > 1 && !showTieOptions) {
      const voteCounts = calculateVoteCounts();
      const { filmsWithMaxVotes } = findMaxVotedFilms(voteCounts);
      const toEliminate = filmsInRound.filter(film =>
        filmsWithMaxVotes.includes(film.title)
      );

      // If all films would be eliminated, that's a tie
      if (toEliminate.length === filmsInRound.length && filmsInRound.length > 1) {
        setTiedFilms(toEliminate);
        setShowTieOptions(true);
      }
    }
  }, [allUsersVoted, filmsInRound, calculateVoteCounts, findMaxVotedFilms, showTieOptions]);

  // Calculate films to eliminate and next round films
  const getEliminationInfo = useCallback(() => {
    const voteCounts = calculateVoteCounts();
    const { filmsWithMaxVotes } = findMaxVotedFilms(voteCounts);
    const toEliminate = filmsInRound.filter(film =>
      filmsWithMaxVotes.includes(film.title)
    );
    const nextRoundFilms = filmsInRound.filter(film =>
      !toEliminate.some(el => el.title === film.title)
    );

    return { toEliminate, nextRoundFilms };
  }, [filmsInRound, calculateVoteCounts, findMaxVotedFilms]);

  const { toEliminate, nextRoundFilms } = getEliminationInfo();

  // Handle case where only one film remains after elimination
  useEffect(() => {
    if (nextRoundFilms.length === 1 && showTieOptions) {
      setShowTieOptions(false);
    }
  }, [nextRoundFilms.length, showTieOptions]);

  // cast a single elimination vote
  const vote = async () => {
    if (!chosenFilm) return;

    setIsLoading(true);
    // Reset tie options when a new vote is cast
    setShowTieOptions(false);
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
    setIsLoading(false);
  };

  // finalize when only one film remains in next round
  const acceptSingleWinner = async (winners = nextRoundFilms) => {
    setIsLoading(true);
    const { error } = await supabase
      .from("sessions")
      .update({
        stage: "result",
        winners: winners,
        allow_multiple_winners: false
      })
      .eq("id", sessionId);

    if (error) console.error("Error finalizing single winner", error);
    setSendToResults(true);
    setIsLoading(false);
  };

  // handle elimination or final results
  const handleElimination = async () => {
    if (isLoading) return;
    setIsLoading(true);
    // Force reset tie options state when starting next round
    setShowTieOptions(false);

    const { toEliminate, nextRoundFilms } = getEliminationInfo();

    // If there would be a full tie, show tie options
    if (toEliminate.length === filmsInRound.length) {
      setTiedFilms(toEliminate);
      setShowTieOptions(true);
      setIsLoading(false);
      return;
    }

    // Update local state immediately
    setFilmsInRound(nextRoundFilms);

    // If there's only one film left, finalize
    if (nextRoundFilms.length === 1) {
      await acceptSingleWinner(nextRoundFilms);
      return;
    }

    // Otherwise, update for next round
    const { error } = await supabase
      .from("sessions")
      .update({
        round: session.round + 1,
        current_round_films: nextRoundFilms,
        users: session.users.map((u) => ({ ...u, votes: {}, ready: false })),
      })
      .eq("id", sessionId);

    if (error) console.error("Error advancing elimination round", error);
    setChosenFilm("");
    setIsLoading(false);
  };

  // start another tie-breaker round with same films
  const startTieBreakerRound = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // Update local state first
    setFilmsInRound(tiedFilms);

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
    setIsLoading(false);
  };

  // accept multiple winners as tie
  const acceptMultipleWinners = async () => {
    if (isLoading) return;
    setIsLoading(true);

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
    setIsLoading(false);
  };

  // Don't show voting UI if we've navigated to results or only one film remains
  if (sendToResults || filmsInRound.length <= 1) {
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
              {filmsInRound.map((film) => (
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
              disabled={!chosenFilm || isLoading}
            >
              {isLoading ? "submitting..." : "submit"}
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
                  {toEliminate.map((film) => (
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
                <button
                  className={styles.button}
                  onClick={startTieBreakerRound}
                  disabled={isLoading}
                >
                  start tie-breaker round
                </button>
                <button
                  className={`${styles.button} ${styles.dark}`}
                  onClick={acceptMultipleWinners}
                  disabled={isLoading}
                >
                  accept multiple winners
                </button>
              </>
            ) : nextRoundFilms.length > 1 ? (
              <button
                className={styles.button}
                onClick={handleElimination}
                disabled={isLoading}
              >
                {isLoading ? "processing..." : "next round"}
              </button>
            ) : (
              <button
                className={`${styles.button} ${styles.dark}`}
                onClick={() => acceptSingleWinner()}
                disabled={isLoading}
              >
                {isLoading ? "processing..." : "see results"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EliminationVoting;
