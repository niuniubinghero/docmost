import classes from "../styles/ai-chat.module.css";

type Props = {
  count?: number;
};

export default function ChatSkeleton({ count = 3 }: Props) {
  return (
    <div className={classes.messageListWrapper}>
      <div className={classes.messageList}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={classes.skeletonMessage}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={classes.skeletonAvatar} />
            <div className={classes.skeletonContent}>
              <div className={classes.skeletonLine} />
              <div className={classes.skeletonLine} />
              <div className={classes.skeletonLine} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
