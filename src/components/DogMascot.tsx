import styles from "./DogMascot.module.css";

type Props = {
  message?: string;
};

export function DogMascot({ message }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.dog}><img
  src="/dog/dog-home.webp"
  alt="マスコット犬"
  style={{ width: 120, height: 120 }}
/>
</div>
      {message && <div className={styles.balloon}>{message}</div>}
    </div>
  );
}
