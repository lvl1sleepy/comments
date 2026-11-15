interface Props {
  message?: string;
}

export default function LoadingState({ message = "Loading..." }: Props) {
  return <p role="status">{message}</p>;
}
