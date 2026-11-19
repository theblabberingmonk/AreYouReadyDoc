import Link from "next/link";
import { ArrowRight } from "./Icons";
export default function PublicNav() {
  return <nav className="public-nav" aria-label="Primary"><div className="public-nav__links"><Link href="/#features">The study space</Link><Link href="/#how-it-works">How it works</Link></div><Link href="/sign-in" className="nav-signin">Sign in</Link><Link href="/sign-up" className="btn btn-primary">Get started <ArrowRight /></Link></nav>;
}
