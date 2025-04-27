import { useUser } from "../../contexts/UserContext";
import { ISession } from "../../interfaces/ISession";
import { useVotingLogic } from "../Voting/useVotingLogic";
import VotingLayout from "../Voting/VotingLayout";
import styles from "../Voting/Voting.module.scss";

function EliminationVoting({ session }: { session: ISession }) {
  const { userData } = useUser();
  
  const {
    filmsInRound,
    chosenFilm,
    setChosenFilm,
    sendToResults,
    showTieOptions,
    isLoading,
    allUsersVoted,
    currUserVoted,
    isUserInSession,
    remainingUsers,
    toEliminate,
    nextRoundFilms,
    vote,
    handleElimination,
    startTiebreakerRound,
    acceptMultipleWinners,
    acceptSingleWinner
  } = useVotingLogic({
    session,
    userData,
    strategy: 'elimination'
  });

  if (sendToResults) {
    return null;
  }

  // Only show voting UI if there's more than one film
  if (filmsInRound.length <= 1) {
    return null;
  }

  // Render the eliminated films section
  const eliminatedFilmsSection = allUsersVoted && (
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
  );

  // Bottom action content for after voting
  const bottomActionContent = showTieOptions ? (
    <>
      <button
        className={styles.button}
        onClick={startTiebreakerRound}
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
  );

  return (
    <VotingLayout
      round={session.round}
      title="round"
      subtitle="vote to eliminate your least favorite"
      isUserInSession={isUserInSession}
      currUserVoted={currUserVoted}
      allUsersVoted={allUsersVoted}
      remainingUsers={remainingUsers}
      isLoading={isLoading}
      showTieOptions={showTieOptions}
      tieMessage="there's a tie!"
      films={filmsInRound}
      chosenFilm={chosenFilm}
      onFilmSelect={setChosenFilm}
      onSubmitVote={vote}
      eliminatedFilms={eliminatedFilmsSection}
      bottomContent={bottomActionContent}
    />
  );
}

export default EliminationVoting;
