/**
 * Widget stylesheet, injected into the Shadow DOM.
 * Values transcribed from the approved Claude Design "Chat Widget" component:
 * light/dark surface sets, accent + auto-contrast ink via CSS vars, 18px panel
 * radius, 58px launcher, wDot/wCaret/wPulse/wIn keyframes, mobile sheet.
 */
export const css = `
:host { all: initial; }
* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Schibsted Grotesk', ui-sans-serif, system-ui, -apple-system, sans-serif; }
button, input, textarea { font: inherit; color: inherit; }

.root {
  position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
  display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
  --wp: #FBFAF6; --wsf: #FFFFFF; --wbd: #E4DFD2;
  --wt: #20241F; --wt2: #6A7062; --wt3: #969B8C;
  --ok: #2F7D4F; --ok-bg: rgba(47,125,79,.1); --ok-bd: rgba(47,125,79,.25);
  --bad: #B0452F; --warn: #A96F1F; --warn-bg: rgba(176,124,44,.14);
}
.root.dark {
  --wp: #181C17; --wsf: #20261F; --wbd: #333B31;
  --wt: #ECEBE1; --wt2: #A9AC9D; --wt3: #7C816F;
}

@keyframes wDot { 0%,60%,100% { transform: translateY(0); opacity:.4 } 30% { transform: translateY(-4px); opacity:1 } }
@keyframes wCaret { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
@keyframes wPulse { 0% { box-shadow:0 0 0 0 rgba(111,198,152,.55) } 70% { box-shadow:0 0 0 6px rgba(111,198,152,0) } 100% { box-shadow:0 0 0 0 rgba(111,198,152,0) } }
@keyframes wIn { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform:none } }
@media (prefers-reduced-motion: reduce) {
  .anim-in, .bubble-in { animation: none !important; }
}

/* Inline mode: fills its container, always open, no launcher. */
.root.inline { position: static; inset: auto; width: 100%; height: 100%; align-items: stretch; }
.root.inline .panel { width: 100%; height: 100%; max-height: none; animation: none; }

/* ── Launcher ─────────────────────────────────────────── */
.launcher {
  width: 58px; height: 58px; border: none; border-radius: 50%;
  background: var(--wa); color: var(--wai); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 14px 34px -8px rgba(24,33,28,.45);
  transition: transform .15s ease;
}
.launcher:hover { transform: scale(1.06); }
.launcher:focus-visible { outline: 2px solid var(--wa); outline-offset: 3px; }

/* ── Panel ────────────────────────────────────────────── */
.panel {
  display: flex; flex-direction: column;
  width: 360px; height: 540px; max-height: calc(100vh - 110px); min-height: 0;
  background: var(--wp); border: 1px solid var(--wbd); border-radius: 18px;
  box-shadow: 0 24px 60px -18px rgba(24,33,28,.35);
  overflow: hidden;
  animation: wIn .25s ease both;
}
@media (max-width: 480px) {
  .root { bottom: 12px; right: 12px; left: 12px; align-items: stretch; }
  .panel { width: 100%; height: min(78vh, 620px); max-height: none; border-radius: 18px 18px 12px 12px; }
  .launcher { align-self: flex-end; }
}

/* ── Header ───────────────────────────────────────────── */
.hdr { display: flex; gap: 11px; align-items: center; padding: 13px 15px; background: var(--wa); color: var(--wai); flex: none; }
.hdr-avatar {
  width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.17);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Newsreader', Georgia, serif; font-style: italic; font-size: 19px; flex: none;
}
.hdr-info { flex: 1; min-width: 0; }
.hdr-name { font-size: 14.5px; font-weight: 700; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hdr-status { display: flex; align-items: center; gap: 6px; font-size: 11px; opacity: .82; margin-top: 1px; }
.hdr-dot { width: 7px; height: 7px; border-radius: 50%; background: #8FDCAF; animation: wPulse 2.4s ease-out infinite; flex: none; }
.hdr-close {
  width: 28px; height: 28px; border: none; border-radius: 8px;
  background: rgba(255,255,255,.12); color: var(--wai); cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex: none;
}
.hdr-close:hover { background: rgba(255,255,255,.24); }
.hdr-close:focus-visible { outline: 2px solid var(--wai); outline-offset: 1px; }

/* ── Messages ─────────────────────────────────────────── */
.msgs { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 14px 10px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; }
.bubble-in { animation: wIn .3s ease both; }
.msg-user {
  align-self: flex-end; max-width: 82%;
  background: var(--wa); color: var(--wai);
  padding: 9px 13px; border-radius: 14px 14px 4px 14px;
  font-size: 13.5px; line-height: 1.5; overflow-wrap: break-word;
}
.msg-bot-wrap { align-self: flex-start; max-width: 88%; display: flex; flex-direction: column; gap: 6px; }
.msg-bot {
  background: var(--wsf); border: 1px solid var(--wbd); color: var(--wt);
  padding: 10px 13px; border-radius: 14px 14px 14px 4px;
  font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: break-word;
}
.caret { display: inline-block; width: 7px; height: 13px; background: var(--wa); margin-left: 3px; vertical-align: -2px; animation: wCaret .7s steps(1) infinite; }

.meta { display: flex; align-items: center; gap: 6px; padding: 0 3px; }
.meta-src { font-size: 11px; color: var(--wt3); }
.meta-src a { color: var(--wt3); text-decoration: underline; }
.meta-src a:hover { color: var(--wa); }
.meta-none { font-size: 11px; color: var(--wt3); font-style: italic; }
.meta-spacer { flex: 1; }
.fb {
  width: 22px; height: 22px; border: none; border-radius: 6px;
  background: transparent; color: var(--wt3); cursor: pointer;
  display: flex; align-items: center; justify-content: center; padding: 0;
}
.fb:hover.up, .fb.up.on { background: rgba(47,125,79,.15); color: var(--ok); }
.fb:hover.dn, .fb.dn.on { background: rgba(176,69,47,.14); color: var(--bad); }
.fb:focus-visible { outline: 2px solid var(--wa); outline-offset: 1px; }

/* Inline details form (honest refusal) */
.mini-form {
  background: var(--wsf); border: 1px solid var(--wbd); border-radius: 12px;
  padding: 10px; display: flex; flex-direction: column; gap: 7px; animation: wIn .35s ease both;
}
.mini-form input {
  padding: 8px 10px; border: 1px solid var(--wbd); border-radius: 8px;
  background: var(--wp); color: var(--wt); font-size: 12.5px; outline: none;
}
.mini-form input:focus { border-color: var(--wa); }
.btn-accent {
  padding: 9px 12px; border: none; border-radius: 8px;
  background: var(--wa); color: var(--wai);
  font-size: 12.5px; font-weight: 700; cursor: pointer;
}
.btn-accent:hover { filter: brightness(1.08); }
.btn-accent:focus-visible { outline: 2px solid var(--wt); outline-offset: 1px; }
.form-done {
  display: flex; align-items: center; gap: 7px;
  background: var(--ok-bg); border: 1px solid var(--ok-bd); border-radius: 10px;
  padding: 9px 11px; font-size: 12.5px; color: var(--wt); animation: wIn .3s ease both;
}
.form-err { font-size: 11.5px; color: var(--bad); }

/* Typing indicator */
.typing {
  align-self: flex-start; background: var(--wsf); border: 1px solid var(--wbd);
  border-radius: 14px 14px 14px 4px; padding: 12px 14px; display: flex; gap: 4px;
  animation: wIn .25s ease both;
}
.typing span { width: 6px; height: 6px; border-radius: 50%; background: var(--wt3); animation: wDot 1.1s ease infinite; }
.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }

/* Suggested chips */
.chips { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 2px; animation: wIn .4s ease both; }
.chip {
  border: 1px solid var(--wbd); background: var(--wsf); color: var(--wa);
  font-size: 12.5px; font-weight: 600; padding: 7px 12px; border-radius: 999px;
  cursor: pointer; text-align: left;
}
.chip:hover { border-color: var(--wa); background: var(--wp); }
.chip:focus-visible { outline: 2px solid var(--wa); outline-offset: 1px; }

/* ── Composer ─────────────────────────────────────────── */
.composer { flex: none; border-top: 1px solid var(--wbd); padding: 10px 12px 8px; display: flex; flex-direction: column; gap: 7px; background: var(--wsf); }
.composer-row { display: flex; gap: 8px; align-items: center; }
.composer input {
  flex: 1; min-width: 0; padding: 10px 13px;
  border: 1px solid var(--wbd); border-radius: 999px;
  background: var(--wp); color: var(--wt); font-size: 13.5px; outline: none;
}
.composer input:focus { border-color: var(--wa); box-shadow: 0 0 0 3px color-mix(in srgb, var(--wa) 14%, transparent); }
.send {
  width: 38px; height: 38px; flex: none; border: none; border-radius: 50%;
  background: var(--wa); color: var(--wai); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.send:hover { filter: brightness(1.1); }
.send:disabled { opacity: .55; cursor: default; filter: none; }
.send:focus-visible { outline: 2px solid var(--wt); outline-offset: 2px; }
.footer-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.disclaimer { font-size: 10.5px; color: var(--wt3); }
.powered { font-size: 10px; color: var(--wt3); white-space: nowrap; }
.powered strong { font-weight: 700; }

/* ── Degraded — polite contact form ───────────────────── */
.degraded { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 18px; display: flex; flex-direction: column; gap: 12px; }
.degraded-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: var(--warn-bg); color: var(--warn);
  display: flex; align-items: center; justify-content: center;
}
.degraded-title { font-size: 15.5px; font-weight: 700; color: var(--wt); letter-spacing: -.01em; }
.degraded-sub { font-size: 13px; line-height: 1.55; color: var(--wt2); margin-top: -6px; }
.degraded-form { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; }
.degraded-form input, .degraded-form textarea {
  padding: 10px 12px; border: 1px solid var(--wbd); border-radius: 10px;
  background: var(--wsf); color: var(--wt); font-size: 13px; outline: none; resize: none;
}
.degraded-form input:focus, .degraded-form textarea:focus { border-color: var(--wa); }
.degraded-form .btn-accent { padding: 11px 14px; border-radius: 10px; font-size: 13.5px; }
.degraded-ok {
  padding: 14px; border-radius: 12px;
  background: var(--ok-bg); border: 1px solid var(--ok-bd);
  color: var(--wt); font-size: 13px; line-height: 1.5; animation: wIn .3s ease both;
}
.degraded-retry { border: none; background: none; color: var(--wt3); font-size: 11.5px; cursor: pointer; text-decoration: underline; align-self: flex-start; }
.degraded-retry:hover { color: var(--wt); }
`;
