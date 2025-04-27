import { useUser } from "../../contexts/UserContext";
import { ISession } from "../../interfaces/ISession";
import { useVotingLogic } from "../Voting/useVotingLogic";
import VotingLayout from "../Voting/VotingLayout";
import styles from "../Voting/Voting.module.scss";

function SimpleVoting({ session }: { session: ISession }) {
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
    eliminatedFilms,
    vote,
    handleSendToResults,
    startTiebreakerRound,
    acceptMultipleWinners
  } = useVotingLogic({
    session,
    userData,
    strategy: 'simple_vote'
  });

  if (sendToResults) {
    return null;
  }

  // Render the eliminated films section
  const eliminatedFilmsSection = showTieOptions && eliminatedFilms.length > 0 && (
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
  );

  // Bottom action content for after voting
  const bottomActionContent = showTieOptions ? (
    <>
      <button
        className={`${styles.button}`}
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
  ) : (
    <button
      className={`${styles.button} ${styles.dark}`}
      onClick={handleSendToResults}
      disabled={isLoading}
    >
      {isLoading ? "processing..." : "see results!"}
    </button>
  );

  return (
    <VotingLayout
      round={session.round}
      title="this is round"
      subtitle={session.round > 1 
        ? "tie-breaker round: vote for your favorite" 
        : "vote for the one you want"}
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

export default SimpleVoting;
