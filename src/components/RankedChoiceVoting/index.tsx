import { useUser } from "../../contexts/UserContext";
import { useVotingLogic } from "../Voting/useVotingLogic";
import { ISession, IFilm } from "../../interfaces/ISession";
import styles from "./index.module.scss";

function RankedChoiceVoting({ session }: { session: ISession }) {
  const { userData } = useUser();
  
  const {
    filmsInRound,
    vote,
    showTieOptions,
    tiedFilms,
    isLoading,
    allUsersVoted,
    currUserVoted,
    isUserInSession,
    remainingUsers,
    rankings,
    updateRanking,
    startTiebreakerRound,
    acceptMultipleWinners,
    handleSendToResults,
    sendToResults
  } = useVotingLogic({
    session,
    userData,
    strategy: 'ranked_choice'
  });

  const isAdmin = userData.color === session.admin_color;

  // Handle reordering
  const handleMoveFilm = (filmTitle: string, direction: 'up' | 'down') => {
    if (!rankings || currUserVoted) return;
    
    const currentRank = rankings[filmTitle];
    let newRank = currentRank;
    
    if (direction === 'up' && currentRank > 1) {
      newRank = currentRank - 1;
    } else if (direction === 'down' && currentRank < filmsInRound.length) {
      newRank = currentRank + 1;
    }
    
    if (newRank !== currentRank) {
      updateRanking(filmTitle, newRank);
    }
  };

  if (sendToResults) {
    return null;
  }

  if (showTieOptions) {
    return (
      <div className={styles.container}>
        <h2>Tie Detected!</h2>
        <div className={styles.tieOptions}>
          <p>These films have tied:</p>
          <div className={styles.tiedFilms}>
            {tiedFilms.map((film: IFilm) => (
              <div key={film.title} className={styles.tiedFilm}>
                {film.title}
              </div>
            ))}
          </div>
          {isAdmin ? (
            <div className={styles.tieButtons}>
              <button 
                onClick={startTiebreakerRound}
                className={styles.button}
              >
                Start Tiebreaker Round
              </button>
              <button 
                onClick={acceptMultipleWinners}
                className={styles.button}
              >
                Accept All as Winners
              </button>
            </div>
          ) : (
            <div className={styles.adminWaitingMessage}>waiting for admin to decide what to do next...</div>
          )}
        </div>
      </div>
    );
  }

  // Sort films by their current ranking
  const sortedFilms = [...filmsInRound].sort((a: IFilm, b: IFilm) => 
    (rankings[a.title] || 999) - (rankings[b.title] || 999)
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Rank the films from your most preferred (top) to least preferred (bottom)
      </h1>
      
      <div className={styles.content}>
        <div className={styles.rankingContainer}>
          <ul className={styles.rankingList}>
            {sortedFilms.map((film: IFilm, index: number) => (
              <li key={film.title} className={styles.rankingItem}>
                <div className={styles.rankNumber}>{index + 1}</div>
                <div className={styles.filmInfo}>
                  <h3>{film.title}</h3>
                  {film.nominated_by && (
                    <p>Nominated by: {film.nominated_by}</p>
                  )}
                </div>
                {!currUserVoted && (
                  <div className={styles.controls}>
                    <button 
                      onClick={() => handleMoveFilm(film.title, 'up')}
                      disabled={index === 0}
                      className={styles.moveButton}
                    >
                      ↑
                    </button>
                    <button 
                      onClick={() => handleMoveFilm(film.title, 'down')}
                      disabled={index === sortedFilms.length - 1}
                      className={styles.moveButton}
                    >
                      ↓
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          
          {!currUserVoted && isUserInSession && (
            <div className={styles.submitContainer}>
              <button
                onClick={vote}
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? 'Submitting...' : 'Submit My Rankings'}
              </button>
            </div>
          )}
        </div>
        
        <div className={styles.sidebar}>
          <div className={styles.usersContainer}>
            <h3 className={styles.sidebarTitle}>Voters</h3>
            <ul className={styles.usersList}>
              {session.users.map((user: any) => (
                <li 
                  key={user.id || user.color}
                  className={`${styles.userItem} ${user.ready ? styles.userReady : ''}`}
                >
                  <div className={styles.userColor} style={{ backgroundColor: user.color || '#ccc' }}></div>
                  <span>{user.name}</span>
                  {user.ready && <span className={styles.readyIndicator}>✓</span>}
                </li>
              ))}
            </ul>
          </div>
          
          {allUsersVoted && isUserInSession && (
            <div className={styles.actionsContainer}>
              {isAdmin ? (
                <button
                  onClick={handleSendToResults}
                  className={styles.nextButton}
                >
                  Complete Voting
                </button>
              ) : (
                <div className={styles.adminWaitingMessage}>waiting for admin to show results...</div>
              )}
            </div>
          )}
          
          {remainingUsers > 0 && (
            <div className={styles.waitingMessage}>
              <h3>Waiting for votes from:</h3>
              <ul>
                {session.users.filter((user: any) => !user.ready).map((user: any) => (
                  <li key={user.id || user.color}>{user.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RankedChoiceVoting;
