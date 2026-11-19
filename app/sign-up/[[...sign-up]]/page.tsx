import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <main className="shell auth-page">
      <p className="eyebrow">Join</p>
      <h1>Create your account</h1>
      <p className="lede">
        One account keeps your revised questions, bookmarks and notes in sync on every
        device.
      </p>
      <div className="auth-card">
        <Suspense>
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </Suspense>
      </div>
    </main>
  );
}
