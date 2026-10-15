import { getState } from "./store";

let opener: () => void = () => {};

export function setSignInOpener(fn: () => void) {
  opener = fn;
}

/** Run `then` if signed in; otherwise ask to sign in first. */
export function requireAccount(then?: () => void): boolean {
  if (getState().signedIn) {
    then?.();
    return true;
  }
  opener();
  return false;
}
