import type { Metadata } from "next";
import { SignInScreen } from "./sign-in-screen";

export const metadata: Metadata = {
  title: "Sign in | ChatApp",
  description: "Sign in securely with Google to continue to your conversations.",
};

export default function SignInPage() {
  return <SignInScreen />;
}
