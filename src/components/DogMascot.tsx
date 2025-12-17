import styles from "./DogMascot.module.css";

type Props = {
  message?: string;
};

export function DogMascot({ message }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.dog}>🐶</div>
      {message && <div className={styles.balloon}>{message}</div>}
    </div>
  );
}
