import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import AuthPage from "@/components/AuthPage";
export default function SignUpPage() {
  return <AuthPage mode="sign-up"><Suspense fallback={<p role="status">Loading secure sign up…</p>}><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/library" /></Suspense></AuthPage>;
}
