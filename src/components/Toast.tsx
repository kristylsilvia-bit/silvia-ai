import { CheckIcon, ErrorIcon } from "./icons";

export interface ToastState {
  message: string;
  error: boolean;
  show: boolean;
}

export default function Toast({ message, error, show }: ToastState) {
  return (
    <div className={"toast" + (error ? " error" : "") + (show ? " show" : "")}>
      {error ? <ErrorIcon /> : <CheckIcon />}
      <span>{message}</span>
    </div>
  );
}
