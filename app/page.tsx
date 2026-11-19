import Link from "next/link";
import { getIndex, getLessonsIndex } from "@/lib/content";
import { ArrowRight, BookOpen, Layers, CheckCircle, Clock, Bookmark, Shield } from "@/components/Icons";

export default function HomePage() {
  const index = getIndex();
  const modules = getLessonsIndex().length;
  return (
    <main className="landing">
      <section className="shell landing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow"><span /> Made for DrNB Paediatric Surgery</p>
          <h1 id="hero-title">Big exam.<br />Clearer <em>plan.</em></h1>
          <p className="hero-description">Your residency is demanding enough. Bring your past papers, illustrated answers and revision into one focused study space.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-large" href="/sign-up">Start preparing <ArrowRight /></Link>
            <Link className="text-link" href="/sign-in">Already have an account? Sign in <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="hero-note"><Shield /> Your notes. Your progress. One account.</p>
        </div>
        <div className="hero-visual" aria-label="Illustration of the study workflow">
          <div className="visual-topline"><span className="tiny-cross">✳</span><span>A LITTLE STRUCTURE GOES A LONG WAY</span></div>
          <div className="study-notebook">
            <div className="notebook-heading"><span className="eyebrow">Your next chapter</span><BookOpen /></div>
            <h2>One focused<br />session at a time.</h2>
            <p>A study routine that fits around your rounds.</p>
            <div className="notebook-steps">
              <div><span className="step-icon"><BookOpen /></span><span><strong>Understand the essentials</strong><small>Learn with syllabus linked modules</small></span><span className="step-number">01</span></div>
              <div><span className="step-icon"><Layers /></span><span><strong>Put your knowledge to work</strong><small>Practise with past theory papers</small></span><span className="step-number">02</span></div>
              <div><span className="step-icon"><CheckCircle /></span><span><strong>Come back stronger</strong><small>Save, track and revisit your revision</small></span><span className="step-number">03</span></div>
            </div>
            <div className="notebook-bottom"><span className="status-light" /> Built around the way you study <span aria-hidden="true">↗</span></div>
          </div>
          <div className="visual-caption"><span>Less scattered. More prepared.</span><span aria-hidden="true">↳</span></div>
        </div>
      </section>

      <section className="stats-strip" aria-label="Available study material">
        <div className="shell stats-inner">
          <p>Small steps.<br /><strong>A solid foundation.</strong></p>
          <div><strong>{index.papers.length}</strong><span>Past theory papers</span></div>
          <div><strong>{index.total_questions}</strong><span>Written model answers</span></div>
          <div><strong>{modules}</strong><span>Syllabus linked modules</span></div>
        </div>
      </section>

      <section id="features" className="shell feature-section">
        <div className="section-intro"><p className="eyebrow">A place for everything</p><h2>Spend your time studying.<br />Not finding your material.</h2><p>From your first read to your final revision, keep the things that matter close.</p></div>
        <div className="feature-layout">
          <article className="feature-main"><BookOpen /><span className="feature-index">01 / UNDERSTAND</span><h3>Answers with<br />the bigger picture.</h3><p>Read structured model answers alongside original illustrations. Connect individual questions to the syllabus, so the detail has somewhere to belong.</p><div className="feature-tags"><span>Past papers</span><span>Model answers</span><span>Illustrations</span></div></article>
          <div className="feature-side">
            <article><span className="feature-symbol"><Clock /></span><div><span className="feature-index">02 / PRACTISE</span><h3>Make room for exam mode.</h3><p>Work through a paper under timed conditions, then review your answers and identify what needs another pass.</p></div></article>
            <article><span className="feature-symbol"><Bookmark /></span><div><span className="feature-index">03 / REMEMBER</span><h3>Keep your place. Everywhere.</h3><p>Bookmark questions, leave yourself a note and track what you have revised. Your record follows your account across devices.</p></div></article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="routine-section">
        <div className="shell routine-inner"><div><p className="eyebrow">Make it your routine</p><h2>Between rounds.<br />Before the exam.<br /><em>At your own pace.</em></h2></div>
          <ol className="routine-list"><li><span>01</span><div><h3>Settle into your study space</h3><p>Create an account to keep your revision together.</p></div></li><li><span>02</span><div><h3>Choose your starting point</h3><p>Pick a paper, follow a module or focus on a topic.</p></div></li><li><span>03</span><div><h3>Build on each session</h3><p>Mark your progress and return to what needs attention.</p></div></li></ol>
        </div>
      </section>

      <section className="shell landing-faq" aria-labelledby="faq-title"><div><p className="eyebrow">Before you begin</p><h2 id="faq-title">A few things<br />worth knowing.</h2></div><div className="faq-list">
        <details><summary>Who is this for?<span aria-hidden="true">+</span></summary><p>Residents preparing for DrNB Paediatric Surgery final theory examinations. The papers and learning modules are organised for focused exam revision.</p></details>
        <details><summary>Do I need an account?<span aria-hidden="true">+</span></summary><p>Yes. Create an account or sign in to open the papers, questions and study tools. Your account also keeps your notes, bookmarks and progress in sync.</p></details>
        <details><summary>Can I study on my phone?<span aria-hidden="true">+</span></summary><p>Yes. The workspace works on mobile, tablet and desktop. Sign in with the same account to continue your revision on another device.</p></details>
        <details><summary>Is this clinical guidance?<span aria-hidden="true">+</span></summary><p>No. This is revision material for exam preparation. Model answers and illustrations should be checked against your textbooks and current guidelines.</p></details>
      </div></section>
      <section className="shell"><div className="landing-cta"><div><p className="eyebrow">You have done the hard work. Keep going.</p><h2>Ready for your next chapter?</h2></div><Link className="btn btn-coral btn-large" href="/sign-up">Create your study space <ArrowRight /></Link></div></section>
    </main>
  );
}
