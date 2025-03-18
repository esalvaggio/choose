import styles from './index.module.scss';

interface UserColorBarProps {
  colors: string[];
}

export function UserColorBar({ colors }: UserColorBarProps) {
  return (
    <div className={styles.usersContainer}>
      {colors.map((color, index) => (
        <div key={index} className={`${styles.userColor} ${styles[color]}`} />
      ))}
    </div>
  );
} 