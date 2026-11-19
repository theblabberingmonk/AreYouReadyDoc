import type { Metadata } from "next";
import SearchView from "@/components/SearchView";

export const metadata: Metadata = {
  title: "Search",
  description: "Instant search across all 170 DrNB Paediatric Surgery questions and model answers.",
};

export default function SearchPage() {
  return (
    <main className="shell" style={{ padding: "44px 24px 72px", maxWidth: "48rem" }}>
      <p className="eyebrow">Search</p>
      <h1>Find it across every paper.</h1>
      <div style={{ marginTop: 20 }}>
        <SearchView />
      </div>
    </main>
  );
}
