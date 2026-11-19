import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <main className="shell auth-page">
      <p className="eyebrow">Welcome back</p>
      <h1>Sign in</h1>
      <p className="lede">
        Sign in to sync your revision record across devices. Reading the papers never
        needs an account.
      </p>
      <div className="auth-card">
        <Suspense>
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
        </Suspense>
      </div>
    </main>
  );
}
