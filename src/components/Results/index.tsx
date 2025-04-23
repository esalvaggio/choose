import { useNavigate } from "react-router-dom";
import { ISession } from "../../interfaces/ISession";
import styles from './index.module.scss';

function Results({ session }: { session: ISession }) {
  const navigate = useNavigate();
  
  // Use the winners field if available
  const winners = session.winners || [];
  
  // If no winners in the field, calculate them
  if (winners.length === 0) {
    const films = session.films.map((film) => ({
      filmTitle: film.title,
      count: 0,
      nominatedBy: film.nominated_by
    }))
    
    session.users.forEach((user) => {
      Object.keys(user.votes).forEach((filmTitle) => {
        const foundFilm = films.find((f) => f.filmTitle === filmTitle)
        if (foundFilm) {
          foundFilm.count++
        }
      })
    })
    
    // Find the film(s) with the highest count
    let maxCount = 0;
    films.forEach((film) => {
      if (film.count > maxCount) {
        maxCount = film.count;
      }
    });
    
    // Get all films with the max count as winners
    const winningFilms = films.filter(film => film.count === maxCount);
    
    // Use the first winner as the primary (for background color)
    const primaryWinner = winningFilms[0];
    
    return (
      <div className={`${styles.container} ${styles[primaryWinner.nominatedBy]}`}>
        <div className={styles.content}>
          {session.round > 1 && <div className={styles.roundText}>final round: {session.round}</div>}
          
          {winningFilms.length > 1 ? (
            <>
              <div className={styles.subheading}>it's a tie! winners:</div>
              <div className={styles.winningTitles}>
                {winningFilms.map(film => (
                  <div key={film.filmTitle} className={styles.winningTitle}>
                    {film.filmTitle}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={styles.subheading}>the following has been chosen:</div>
              <div className={styles.winningTitle}>{primaryWinner.filmTitle}</div>
            </>
          )}
          
          <button 
            className={styles.button}
            onClick={() => navigate('/')}
          >
            start over
          </button>
        </div>
      </div>
    );
  }
  
  // Use the winners field directly if available
  // Get the first winner as the primary (for background color)
  const primaryWinner = winners[0];
  console.log(winners)
  
  return (
    <div className={`${styles.container} ${styles[primaryWinner.nominated_by]}`}>
      <div className={styles.content}>
        {session.round > 1 && <div className={styles.roundText}>final round: {session.round}</div>}
        
        {session.allow_multiple_winners && winners.length > 1 ? (
          <>
            <div className={styles.subheading}>it's a tie! winners:</div>
            <div className={styles.winningTitles}>
              {winners.map(film => (
                <div key={film.title} className={styles.winningTitle}>
                  {film.title}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.subheading}>the following has been chosen:</div>
            <div className={styles.winningTitle}>{primaryWinner.title}</div>
          </>
        )}
        
        <button 
          className={styles.button}
          onClick={() => navigate('/')}
        >
          start over
        </button>
      </div>
    </div>
  );
}

export default Results;
