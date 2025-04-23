import { useNavigate } from "react-router-dom";
import { ISession } from "../../interfaces/ISession";
import styles from './index.module.scss';

function Results({ session }: { session: ISession }) {
  const navigate = useNavigate();
  
  // Use the winners field if available
  const winners = session.winners || [];
  
  // Create the background classnames for multiple winners
  const getBackgroundClass = (winners: any[]) => {
    if (winners.length === 1) {
      return styles[winners[0].nominated_by || winners[0].title]; 
    }
    
    // For multiple winners, use a split-background container
    return styles.splitBackground;
  };
  
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
    
    return (
      <div className={`${styles.container} ${getBackgroundClass(winningFilms)}`}>
        {winningFilms.length > 1 && (
          <div className={styles.backgroundSections}>
            {winningFilms.map((film) => (
              <div 
                key={film.filmTitle} 
                className={`${styles.bgSection} ${styles[film.nominatedBy]}`}
                style={{ width: `${100 / winningFilms.length}%` }}
              />
            ))}
          </div>
        )}
        <div className={styles.backgroundOverlay}></div>
        <div className={styles.content}>
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
              <div className={styles.winningTitle}>{winningFilms[0].filmTitle}</div>
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
  
  return (
    <div className={`${styles.container} ${getBackgroundClass(winners)}`}>
      {winners.length > 1 && (
        <div className={styles.backgroundSections}>
          {winners.map((film) => (
            <div 
              key={film.title} 
              className={`${styles.bgSection} ${styles[film.nominated_by]}`}
              style={{ width: `${100 / winners.length}%` }}
            />
          ))}
        </div>
      )}
      <div className={styles.backgroundOverlay}></div>
      <div className={styles.content}>
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
            <div className={styles.winningTitle}>{winners[0].title}</div>
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
