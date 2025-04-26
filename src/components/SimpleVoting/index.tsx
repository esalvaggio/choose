import { useParams } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import { ISession, IFilm } from "../../interfaces/ISession";
import supabase from "../../supabaseClient";
import { useState, useEffect } from "react";
import styles from "./index.module.scss";

function SimpleVoting({ session }: { session: ISession }) {
  const { sessionId } = useParams();
  const { userData } = useUser();
  const [chosenFilm, setChosenFilm] = useState("");
  const [sendToResults, setSendToResults] = useState(false);
  const [tiedFilms, setTiedFilms] = useState<IFilm[]>([]);
  const [showTieOptions, setShowTieOptions] = useState(false);

  // Initialize current_round_films if it doesn't exist yet
  useEffect(() => {
    if (!session.current_round_films || session.current_round_films.length === 0) {
      initializeCurrentRoundFilms();
    }
  }, [session.films]);

  // Calculate votes and check for ties when all users have voted
  useEffect(() => {
    if (allUsersVoted) {
      const voteCounts = calculateVoteCounts();
      const { filmsWithMaxVotes } = findMaxVotedFilms(voteCounts);

      // If there's a tie (more than one film with max votes)
      if (filmsWithMaxVotes.length > 1) {
        const tiedFilmsData = session.current_round_films?.filter(film =>
          filmsWithMaxVotes.includes(film.title)
        ) || [];

        setTiedFilms(tiedFilmsData);
        setShowTieOptions(true);
      } else {
        setTiedFilms([]);
        setShowTieOptions(false);
      }
    }
  }, [session.users]);

  const initializeCurrentRoundFilms = async () => {
    const { error } = await supabase
      .from("sessions")
      .update({
        current_round_films: session.films
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Error initializing current round films", error);
    }
  };

  const calculateVoteCounts = () => {
    const voteCounts: Record<string, number> = {};

    // Count votes for each film
    session.users.forEach(user => {
      Object.keys(user.votes || {}).forEach(filmTitle => {
        if (voteCounts[filmTitle]) {
          voteCounts[filmTitle] += 1;
        } else {
          voteCounts[filmTitle] = 1;
        }
      });
    });

    return voteCounts;
  };

  const findMaxVotedFilms = (voteCounts: Record<string, number>) => {
    const votes = Object.values(voteCounts);
    const maxVotes = votes.length > 0 ? Math.max(...votes) : 0;

    // Find films with max votes
    const filmsWithMaxVotes = Object.keys(voteCounts).filter(
      film => voteCounts[film] === maxVotes
    );

    return { maxVotes, filmsWithMaxVotes };
  };

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
  };

  const handleSendToResults = async () => {
    // Calculate the winner(s) first
    const voteCounts = calculateVoteCounts();
    const { filmsWithMaxVotes } = findMaxVotedFilms(voteCounts);

    // Get the winning film objects
    const winningFilms = session.films.filter(film =>
      filmsWithMaxVotes.includes(film.title)
    );

    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        stage: "result",
        winners: winningFilms,
        allow_multiple_winners: filmsWithMaxVotes.length > 1
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error updating session stage", updateError);
      return;
    }
    setSendToResults(true);
  };

  const startTiebreakerRound = async () => {
    // Reset all users' votes and increment round
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        users: session.users.map((user) => ({
          ...user,
          votes: {},
          ready: false
        })),
        round: session.round + 1,
        current_round_films: tiedFilms
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error starting tiebreaker round", updateError);
      return;
    }

    setChosenFilm("");
    setShowTieOptions(false);
  };

  const acceptMultipleWinners = async () => {
    // Update session to indicate multiple winners
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        winners: tiedFilms,
        allow_multiple_winners: true,
        stage: "result",
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error accepting multiple winners", updateError);
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

  // Get films that were eliminated in the previous round
  const getEliminatedFilms = () => {
    // Only show eliminated films after round 1 or when we have a tie situation
    if (session.round <= 1 && !showTieOptions) return [];

    // If we have tied films but haven't started the next round yet
    if (showTieOptions && tiedFilms.length > 0) {
      // Films are eliminated if they're in the current round but not in the tied films
      return session.current_round_films?.filter(film =>
        !tiedFilms.some(tiedFilm => tiedFilm.title === film.title)
      ) || [];
    }

    // Standard case: find films that are in the full list but not in current round
    return session.films.filter(film =>
      !session.current_round_films?.some(currentFilm =>
        currentFilm.title === film.title
      )
    );
  };

  const currUserVoted = Object.keys(
    session.users.find((u) => u.color === userData.color)?.votes || {}
  ).length > 0;

  const allUsersVoted = session.users.length > 0 && session.users.every((user) =>
    user.votes && Object.keys(user.votes).length > 0
  );

  const isUserInSession = session.users.some(user => user.color === userData.color);
  // Use the current_round_films for display or fallback to all films if needed
  const filmsToDisplay = session.current_round_films?.length
    ? session.current_round_films
    : session.films;
  console.log(session)

  const eliminatedFilms = getEliminatedFilms();


  if (sendToResults) {
    return null;
  }

  return !currUserVoted && isUserInSession ? (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>this is round: {session.round}</h2>
        <div className={styles.subtitle}>
          {session.round > 1
            ? "tie-breaker round: vote for your favorite"
            : "vote for the one you want"
          }
        </div>

        <div className={styles.votingContainer}>
          <ul className={styles.nominationsList}>
            {filmsToDisplay.map((film) => (
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

        <div className={styles.votingContainer}>
          {!allUsersVoted ? (
            <div># of people we're waiting on: {getRemainingUsers()}</div>
          ) : (
            <h3>everyone has voted!</h3>
          )}

          {showTieOptions && eliminatedFilms.length > 0 && (
            <div className={styles.eliminatedFilms}>
              {session.round > 1 && (
                <h3>the following {eliminatedFilms.length === 1 ? 'has' : 'have'} been <span className={styles.bold}>eliminated</span>:</h3>
              )}
              <ul>
                {eliminatedFilms.map(film => (
                  <li key={film.title} className={styles.eliminatedFilm}>
                    <div className={`${styles.colorBar} ${styles[film.nominated_by]}`} />
                    <span>{film.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {isUserInSession && allUsersVoted && (
          <div className={styles.bottomContent}>
            {showTieOptions ? (
              <>
                <div className={styles.tieMessage}>
                  there's a tie!
                </div>
                {isUserInSession && (
                  <>
                    <button
                      className={`${styles.button}`}
                      onClick={startTiebreakerRound}
                    >
                      start tie-breaker round
                    </button>
                    <button
                      className={`${styles.button} ${styles.dark}`}
                      onClick={acceptMultipleWinners}
                    >
                      accept multiple winners
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {isUserInSession && (
                  <button
                    className={`${styles.button} ${styles.dark}`}
                    onClick={() => handleSendToResults()}
                  >
                    see results!
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SimpleVoting;
