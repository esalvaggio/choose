import { useNavigate } from "react-router-dom";
import { ISession } from "../../interfaces/ISession";
import styles from './index.module.scss';

function Results({ session }: { session: ISession }) {
  const navigate = useNavigate();
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
  // will want to add logic to handle 
  let maxCount = 0
  let winningFilm = films[0]

  films.forEach((film) => {
    if (film.count > maxCount) {
      maxCount = film.count
      winningFilm = film
    }
  })
  return (
    <div className={`${styles.container} ${styles[winningFilm.nominatedBy]}`}>
      <div className={styles.content}>
        {/* <div className={styles.roundText}>end of round: {roundNumber}</div> */}
        <div className={styles.subheading}>the following has been chosen:</div>
        <div className={styles.winningTitle}>{winningFilm.filmTitle}</div>
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
