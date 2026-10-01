import { useReviewCards } from '../hooks/useReviewCards';

interface ReviewDueBadgeProps {
  /** Visual size of the bubble. `sm` sits inline next to a nav label. */
  size?: 'sm' | 'xs';
}

/**
 * Shows how many review cards are waiting, so a student does not have to open
 * the quiz page to find out there is something due. Renders nothing when
 * nothing is due, so a fresh account shows a clean nav bar.
 */
export default function ReviewDueBadge({ size = 'sm' }: ReviewDueBadgeProps) {
  const { summary } = useReviewCards();
  const due = summary.due;
  if (due <= 0) return null;

  const label = due > 99 ? '99+' : String(due);
  const box = size === 'sm' ? 'min-w-[18px] h-[18px] px-1 text-[10px]' : 'min-w-[16px] h-[16px] px-1 text-[9px]';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full font-extrabold tabular-nums leading-none ${box}`}
      style={{ backgroundColor: '#EF4444', color: '#fff' }}
    >
      {label}
    </span>
  );
}