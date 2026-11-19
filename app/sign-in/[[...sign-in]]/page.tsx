import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import AuthPage from "@/components/AuthPage";
export default function SignInPage() {
  return <AuthPage mode="sign-in"><Suspense fallback={<p role="status">Loading secure sign in…</p>}><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/library" /></Suspense></AuthPage>;
}
