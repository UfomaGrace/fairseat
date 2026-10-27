// useAuth: who is signed in, read from the auth slice.
//
//   const { user, signIn, signOut, notice } = useAuth();
//
// - signIn / signOut both clear the RTK Query cache: public events cached while signed out
//   have no mySignup, and the next user must never see the last one's data.
// - notice says why the user was signed out; the sign-in page shows it.

import { useCallback } from "react";
import type { Session } from "../api/types";
import { signedIn } from "../store/authSlice";
import { baseApi, endSession } from "../store/baseApi";
import { useAppDispatch, useAppSelector } from "../store/hooks";

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, token, expiresAt, notice } = useAppSelector((state) => state.auth);

  const signIn = useCallback(
    (session: Session) => {
      dispatch(signedIn(session));
      dispatch(baseApi.util.resetApiState());
    },
    [dispatch],
  );

  /** reason is shown on the sign-in page, e.g. "You've signed out." */
  const signOut = useCallback((reason?: string) => endSession(dispatch, reason), [dispatch]);

  return { user, token, expiresAt, notice, signIn, signOut };
}
