import { create } from "zustand";

type SessionStore = {
  session: any;
  setSession: (session: any) => void;
};

export const useSession = create<SessionStore>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
}));

export const setSession = (session: any) => useSession.getState().setSession(session);

