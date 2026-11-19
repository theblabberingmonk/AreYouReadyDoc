"use client";

import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

export default function AuthControls() {
  return (
    <span className="auth-controls">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className="btn btn-ghost btn-sm">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="btn btn-sm">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "auth-avatar",
            },
          }}
        />
      </Show>
    </span>
  );
}
