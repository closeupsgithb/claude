type Props = {
  text: string;
};

// Small "i" trigger that reveals an explanation on hover/focus, so metric
// definitions and data-availability caveats don't have to live as permanent
// copy in the layout. tabIndex makes it keyboard-reachable.
export default function InfoTip({ text }: Props) {
  return (
    <span className="info-tip" tabIndex={0}>
      <span className="info-tip-trigger" aria-hidden="true">
        i
      </span>
      <span className="info-tip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
