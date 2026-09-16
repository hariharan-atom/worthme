"use client";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { answerErrors, INCOME_RANGES, isPublicResult, type Answers } from "@/lib/worth";
import { compressProfile } from "@/lib/profile";
import { packResult } from "@/lib/share";
import { Icon, LoadingExperience, Logo } from "./brand";

export default function QuizDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const alive = useRef(true);
  const [answers, setAnswers] = useState<Answers>({ name: "", age: 0, profession: "", income: "", location: "", goal: "" });
  const [step, setStep] = useState<"profile" | "details">("profile");
  const [errors, setErrors] = useState<Partial<Record<keyof Answers, string>>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    alive.current = true;
    const node = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    node.showModal();
    // Keep Tab inside the dialog instead of cycling into browser chrome.
    function containFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const controls = Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'))
        .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); title.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === title.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    node.addEventListener("keydown", containFocus);
    document.body.style.overflow = "hidden";
    return () => {
      alive.current = false;
      request.current?.abort();
      node.removeEventListener("keydown", containFocus);
      node.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, []);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    dialog.current?.querySelector(".dialog-body")?.scrollTo({ top: 0 });
  }, [step, loading]);

  function close() { request.current?.abort(); onClose(); }
  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setError("");
  }
  async function selectProfile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setCompressing(true); setError("");
    try { const data = await compressProfile(file); if (alive.current) update("profileImage", data); }
    catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "We could not prepare that photo."); }
    finally { if (alive.current) setCompressing(false); }
  }
  function validate(keys: (keyof Answers)[]) {
    const all = answerErrors(answers);
    const relevant = Object.fromEntries(keys.filter(key => all[key]).map(key => [key, all[key]]));
    setErrors(relevant);
    const first = keys.find(key => all[key]);
    if (first) { dialog.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); return false; }
    return true;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (compressing || submitting.current) return;
    if (step === "profile") {
      if (validate(["name", "age", "profileImage"])) setStep("details");
      return;
    }
    if (!validate(["name", "age", "profession", "income", "location", "goal", "profileImage"])) return;
    submitting.current = true;
    setLoading(true); setError("");
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers), signal: controller.signal });
      const body = await response.json();
      if (!alive.current || controller.signal.aborted) return;
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "We could not create your result.");
      if (!isPublicResult(body.result)) throw new Error("The result was incomplete. Please try again.");
      try { sessionStorage.setItem(`worthme:${body.result.slug}`, JSON.stringify(body.result)); } catch { /* Sharing still works when browser storage is blocked. */ }
      router.push(body.stored ? `/r/${body.result.slug}` : `/r/${body.result.slug}?d=${packResult(body.result)}`);
    } catch (cause) {
      if (alive.current) {
        setError(controller.signal.aborted ? "That took too long. Please check your connection and try again." : cause instanceof Error ? cause.message : "Could not connect. Please try again.");
        setLoading(false); submitting.current = false;
      }
    } finally { clearTimeout(timeout); }
  }
  function fieldError(key: keyof Answers) { return errors[key] ? <span id={`${key}-error`} className="field-error">{errors[key]}</span> : null; }
  function inputProps(key: keyof Answers) { return { name: key, "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `${key}-error` : undefined }; }

  return <dialog ref={dialog} className="quiz-dialog" aria-labelledby="quiz-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) { const b = e.currentTarget.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) close(); } }}>
    <header className="dialog-header"><Logo /><button className="icon-button" type="button" onClick={close} aria-label="Close quiz"><Icon name="close" /></button></header>
    {loading ? <div className="dialog-body"><h2 className="sr-only" id="quiz-title" ref={title} tabIndex={-1}>Creating your WorthMe result</h2><LoadingExperience compact /><button className="text-button" onClick={close}>Cancel and return home</button></div> :
    <form onSubmit={submit} noValidate>
      <div className="dialog-body">
        <ol className="step-progress" aria-label="Quiz progress"><li aria-current={step === "profile" ? "step" : undefined}><span>{step === "details" ? <Icon name="check" /> : "1"}</span>Profile</li><li aria-current={step === "details" ? "step" : undefined}><span>2</span>Details</li></ol>
        <div className="dialog-step" key={step}>
          <p className="eyebrow">STEP {step === "profile" ? "01 / 02" : "02 / 02"}</p>
          <h2 id="quiz-title" ref={title} tabIndex={-1}>{step === "profile" ? "First, a little you." : "Big dreams. Small details."}</h2>
          <p className="dialog-lead">{step === "profile" ? "A name, an age, and your best side. No account needed." : "Tell us what keeps you curious. Every field below is required."}</p>
          {step === "profile" ? <>
            <div className="photo-upload">
              <div className="profile-preview">{answers.profileImage ? <img src={answers.profileImage} alt="Your selected profile photo" /> : <Icon name="camera" />}</div>
              <div><strong>Profile photo <small>Optional</small></strong><p>Add a personal touch to your share card.</p><div className="photo-actions"><button type="button" className="text-button" onClick={() => upload.current?.click()} disabled={compressing}>{compressing ? "Preparing photo…" : "Choose photo"}</button>{answers.profileImage && <button type="button" className="text-button" onClick={() => update("profileImage", undefined)} disabled={compressing}>Remove</button>}</div><input ref={upload} type="file" className="sr-only" tabIndex={-1} aria-label="Profile photo" accept="image/jpeg,image/png,image/webp" onChange={selectProfile} /></div>
            </div>
            <div className="fields profile-fields">
              <label htmlFor="name">Display name<input id="name" {...inputProps("name")} autoComplete="nickname" maxLength={28} value={answers.name} onChange={e => update("name", e.target.value)} placeholder="What should we call you?" required />{fieldError("name")}</label>
              <label htmlFor="age">Age <small>18+</small><input id="age" {...inputProps("age")} type="number" inputMode="numeric" min={18} max={120} step={1} value={answers.age || ""} onChange={e => update("age", Number(e.target.value))} placeholder="Your age" required />{fieldError("age")}</label>
            </div>
          </> : <div className="fields">
            <label htmlFor="profession">What do you do?<input id="profession" {...inputProps("profession")} maxLength={60} value={answers.profession} onChange={e => update("profession", e.target.value)} placeholder="e.g. Designer, student, founder" required />{fieldError("profession")}</label>
            <label htmlFor="income">Annual income <small>INR</small><select id="income" {...inputProps("income")} value={answers.income} onChange={e => update("income", e.target.value)} required><option value="">Select a range</option>{INCOME_RANGES.map(range => <option key={range}>{range}</option>)}</select>{fieldError("income")}</label>
            <label htmlFor="location">City<input id="location" {...inputProps("location")} autoComplete="address-level2" maxLength={60} value={answers.location} onChange={e => update("location", e.target.value)} placeholder="e.g. Chennai" required />{fieldError("location")}</label>
            <label htmlFor="goal">What are you chasing?<input id="goal" {...inputProps("goal")} maxLength={120} value={answers.goal} onChange={e => update("goal", e.target.value)} placeholder="e.g. Building my own business" required />{fieldError("goal")}</label>
          </div>}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <footer className="dialog-footer"><div className="modal-actions">{step === "details" && <button className="text-button" type="button" onClick={() => { setStep("profile"); setErrors({}); setError(""); }}>Back</button>}<button className="primary-button" type="submit" disabled={compressing}>{step === "profile" ? "Continue to details" : "Reveal My Worth"}<Icon name="arrow" /></button></div><p>{step === "profile" ? "Photos are automatically compressed. JPG, PNG, or WebP." : "Creates a shareable card with your name and optional photo. Anyone with its link can view it."}</p></footer>
    </form>}
  </dialog>;
}
