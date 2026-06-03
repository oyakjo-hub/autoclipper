import { createAuthClient } from "better-auth/react";

// baseURL harus diset agar request auth dikirim ke URL yang benar,
// terutama saat di production / deployment.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "",
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient;
