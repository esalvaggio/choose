import React, { ReactNode } from 'react';
import { IFilm } from '../../interfaces/ISession';
import styles from './Voting.module.scss';

interface VotingLayoutProps {
  round: number;
  title: string;
  subtitle: string;
  isUserInSession: boolean;
  currUserVoted: boolean;
  allUsersVoted: boolean;
  remainingUsers: number;
  isLoading?: boolean;
  showTieOptions: boolean;
  tieMessage?: string;
  films?: IFilm[];
  chosenFilm?: string;
  onFilmSelect?: (film: string) => void;
  onSubmitVote?: () => void;
  children?: ReactNode;
  bottomContent?: ReactNode;
  eliminatedFilms?: ReactNode;
}

const VotingLayout: React.FC<VotingLayoutProps> = ({
  round,
  title,
  subtitle,
  isUserInSession,
  currUserVoted,
  allUsersVoted,
  remainingUsers,
  isLoading = false,
  showTieOptions = false,
  tieMessage = "there's a tie!",
  films = [],
  chosenFilm = "",
  onFilmSelect = () => {},
  onSubmitVote = () => {},
  children,
  bottomContent,
  eliminatedFilms
}) => {
  // Before voting UI
  if (!currUserVoted && isUserInSession) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>{title}: {round}</h2>
          <div className={styles.subtitle}>{subtitle}</div>

          <div className={styles.votingContainer}>
            {films.length > 0 ? (
              <ul className={styles.nominationsList}>
                {films.map((film) => (
                  <li key={film.title}>
                    <div className={`${styles.colorBar} ${styles[film.nominated_by]}`} />
                    <span className={styles.filmTitle}>{film.title}</span>
                    <input
                      type="radio"
                      name="film-choice"
                      checked={chosenFilm === film.title}
                      onChange={() => onFilmSelect(film.title)}
                      className={styles.radioInput}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              children
            )}
          </div>

          <div className={styles.bottomContent}>
            <button
              className={styles.button}
              onClick={onSubmitVote}
              disabled={!chosenFilm || isLoading}
            >
              {isLoading ? "submitting..." : "submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // After voting UI
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.votingContainer}>
          {!allUsersVoted ? (
            <div># awaiting votes: {remainingUsers}</div>
          ) : (
            <>
              <h3>everyone has voted!</h3>
              {eliminatedFilms}
            </>
          )}
        </div>

        {isUserInSession && allUsersVoted && (
          <div className={styles.bottomContent}>
            {showTieOptions && (
              <div className={styles.tieMessage}>{tieMessage}</div>
            )}
            {bottomContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingLayout; 