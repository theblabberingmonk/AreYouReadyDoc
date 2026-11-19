"use client";
import { UserButton } from "@clerk/nextjs";
export default function AuthControls() {
  return <span className="auth-controls"><UserButton appearance={{ elements: { avatarBox: "auth-avatar" } }} /></span>;
}
