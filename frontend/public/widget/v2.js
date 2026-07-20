/* SupportAI widget v2 — built artifact, do not edit. Source: widget/src */
"use strict";(()=>{function w(r){let e=new AbortController;return setTimeout(()=>e.abort(),2e4),{...r,signal:e.signal}}async function C(r){try{let e=await fetch(`${r.apiUrl}/chat/config?agentId=${encodeURIComponent(r.agentId)}`,w());if(!e.ok)return null;let t=await e.json();return{agentName:t.agentName||"Support",accent:r.accent||t.color||"#2D5A44",theme:r.theme||t.theme||"light",welcomeMessage:t.welcomeMessage||"Hello! How can I help you today?",suggestedQuestions:Array.isArray(t.suggestedQuestions)?t.suggestedQuestions.slice(0,4):[],disclaimer:t.disclaimer||"",poweredBy:t.poweredBy!==!1,status:t.status==="paused"?"paused":"live",v2:!0}}catch{return null}}async function M(r){let e=await fetch(`${r.apiUrl}/chat/start`,w({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:r.agentId})}));if(!e.ok)throw new Error(`start failed: ${e.status}`);let t=await e.json();return{sessionId:t.sessionId,agentName:t.agentName,color:t.color,welcomeMessage:t.welcomeMessage}}async function x(r,e){try{let t=await fetch(`${r}/chat/${encodeURIComponent(e)}/history`,w());if(!t.ok)return null;let n=await t.json();return Array.isArray(n.messages)?n.messages:[]}catch{return null}}async function b(r,e,t,n,i=0){let a;try{a=await fetch(`${r}/chat/message`,w({method:"POST",headers:{"Content-Type":"application/json",Accept:"text/event-stream, application/json"},body:JSON.stringify({sessionId:e,content:t})}))}catch{return i===0?k(r,e,t,n):n.onError("error")}if(a.status===429||a.status===402)return n.onError("limit");if(!a.ok)return a.status>=500&&i===0?k(r,e,t,n):n.onError("error");if((a.headers.get("content-type")||"").includes("text/event-stream")&&a.body)return H(a.body,n);try{let l=await a.json(),o=l.response||"";n.onDelta(o),n.onDone(o,{messageId:l.messageId,answerStatus:l.answerStatus,citations:Array.isArray(l.citations)?l.citations:void 0})}catch{n.onError("error")}}function k(r,e,t,n){return new Promise(i=>{setTimeout(()=>i(b(r,e,t,n,1)),800)})}async function H(r,e){let t=r.getReader(),n=new TextDecoder,i="",a="",p=!1;try{for(;;){let{value:l,done:o}=await t.read();if(o)break;i+=n.decode(l,{stream:!0});let d;for(;(d=i.indexOf(`

`))>=0;){let h=i.slice(0,d);i=i.slice(d+2);let u="message",c="";for(let f of h.split(`
`))f.startsWith("event:")?u=f.slice(6).trim():f.startsWith("data:")&&(c+=f.slice(5).trim());if(!c)continue;let m={};try{m=JSON.parse(c)}catch{}if(u==="delta"){let f=typeof m.text=="string"?m.text:c;a+=f,e.onDelta(f)}else u==="done"?(p=!0,e.onDone(a,m)):u==="error"&&(p=!0,e.onError("error"))}}p||e.onDone(a,{})}catch{p||e.onError("error")}}function E(r,e,t){fetch(`${r}/chat/feedback`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messageId:e,rating:t})}).catch(()=>{})}async function v(r,e){try{return(await fetch(`${r}/chat/escalate`,w({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}))).ok}catch{return!1}}var S=`
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

/* \u2500\u2500 Launcher \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.launcher {
  width: 58px; height: 58px; border: none; border-radius: 50%;
  background: var(--wa); color: var(--wai); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 14px 34px -8px rgba(24,33,28,.45);
  transition: transform .15s ease;
}
.launcher:hover { transform: scale(1.06); }
.launcher:focus-visible { outline: 2px solid var(--wa); outline-offset: 3px; }

/* \u2500\u2500 Panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 Messages \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 Composer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 Degraded \u2014 polite contact form \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
`;var B="supportai_v2_",T="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@1,6..72,400..600&family=Schibsted+Grotesk:wght@400;600;700&display=swap",g={chat:'<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-4.4A8.4 8.4 0 1 1 21 11.5z"></path></svg>',close:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>',send:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4z"></path></svg>',doc:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>',thumb:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h9.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3H14z"></path><path d="M6 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2"></path></svg>',check:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2F7D4F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',mail:'<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H8l-4 4z"></path><path d="M12 8v3"></path><path d="M12 13.5v.01"></path></svg>'};function s(r,e,t){let n=document.createElement(r);return e&&(n.className=e),t!==void 0&&(n.textContent=t),n}function L(r){let e=r.replace("#","");if(e.length<6)return .3;let t=parseInt(e.slice(0,2),16)/255,n=parseInt(e.slice(2,4),16)/255,i=parseInt(e.slice(4,6),16)/255;return .2126*t+.7152*n+.0722*i}var y=class{constructor(e,t){this.panel=null;this.msgs=null;this.chipsRow=null;this.typingEl=null;this.input=null;this.sendBtn=null;this.sessionId=null;this.busy=!1;this.started=!1;this.degradedSource=null;if(this.opts=e,this.cfg=t,this.inline=!!(e.inline&&e.container),!document.querySelector(`link[href="${T}"]`)){let p=document.createElement("link");p.rel="stylesheet",p.href=T,document.head.appendChild(p)}let n=document.createElement("div");n.id="supportai-widget",this.shadow=n.attachShadow({mode:"open"});let i=document.createElement("style");i.textContent=S,this.shadow.appendChild(i);let a=this.cfg.theme==="dark"?"root dark":"root";this.inline&&(a+=" inline"),this.root=s("div",a),this.applyAccent(),this.shadow.appendChild(this.root),this.launcher=s("button","launcher"),this.launcher.setAttribute("aria-label","Open support chat"),this.launcher.innerHTML=g.chat,this.launcher.addEventListener("click",()=>this.toggle()),this.inline?(n.style.display="block",n.style.width="100%",n.style.height="100%",e.container.appendChild(n),this.openPanel()):(this.root.appendChild(this.launcher),document.body.appendChild(n))}applyAccent(){this.root.style.setProperty("--wa",this.cfg.accent),this.root.style.setProperty("--wai",L(this.cfg.accent)>.55?"#1E2420":"#F7F3E8")}toggle(){if(this.panel)return this.closePanel();this.openPanel()}openPanel(){if(this.launcher.style.display="none",this.panel=s("div","panel"),this.panel.appendChild(this.buildHeader()),this.inline?this.root.appendChild(this.panel):this.root.insertBefore(this.panel,this.launcher),this.cfg.status==="paused"){this.renderDegraded("agent_paused");return}this.renderChat(),this.ensureSession()}closePanel(){var e;this.inline||((e=this.panel)==null||e.remove(),this.panel=null,this.msgs=null,this.input=null,this.launcher.style.display="",this.launcher.focus())}buildHeader(){let e=s("div","hdr"),t=s("div","hdr-avatar",(this.cfg.agentName||"S").trim().charAt(0)),n=s("div","hdr-info");n.appendChild(s("div","hdr-name",this.cfg.agentName));let i=s("div","hdr-status");if(i.appendChild(s("span","hdr-dot")),i.appendChild(s("span",void 0,this.cfg.status==="paused"?"Leave a message":"Online \u2014 answers in seconds")),n.appendChild(i),e.append(t,n),!this.inline){let a=s("button","hdr-close");a.setAttribute("aria-label","Minimise chat"),a.innerHTML=g.close,a.addEventListener("click",()=>this.closePanel()),e.appendChild(a)}return e}renderChat(){if(!this.panel)return;this.degradedSource=null,this.msgs=s("div","msgs"),this.msgs.setAttribute("aria-live","polite"),this.panel.appendChild(this.msgs);let e=s("div","composer"),t=s("div","composer-row");this.input=s("input"),this.input.placeholder="Ask a question\u2026",this.input.setAttribute("aria-label","Ask a question"),this.input.addEventListener("keydown",i=>{i.key==="Enter"&&this.send()}),this.sendBtn=s("button","send"),this.sendBtn.setAttribute("aria-label","Send"),this.sendBtn.innerHTML=g.send,this.sendBtn.addEventListener("click",()=>this.send()),t.append(this.input,this.sendBtn),e.appendChild(t);let n=s("div","footer-row");if(n.appendChild(s("span","disclaimer",this.cfg.disclaimer)),this.cfg.poweredBy){let i=s("span","powered");i.append("Powered by "),i.appendChild(s("strong",void 0,"SupportAI")),n.appendChild(i)}e.appendChild(n),this.panel.appendChild(e),this.input.focus()}async ensureSession(){if(this.started){this.restoreTranscriptPlaceholder();return}this.started=!0;let e=B+this.opts.agentId,t=null;try{let n=localStorage.getItem(e);n&&(t=JSON.parse(n).sessionId||null)}catch{}if(t){let n=await x(this.opts.apiUrl,t);if(n){this.sessionId=t,n.length===0&&this.showWelcome();for(let i of n)if(i.role==="user")this.addUserBubble(i.content,!1);else{let a=this.addBotBubble(!1);a.text.textContent=i.content,this.finalizeBot(a,{messageId:i.id,citations:i.citations,answerStatus:i.answer_status},!1)}this.scrollDown();return}try{localStorage.removeItem(e)}catch{}}try{let n=await M(this.opts);if(this.sessionId=n.sessionId,!this.cfg.v2){this.cfg.agentName=n.agentName||this.cfg.agentName,this.cfg.welcomeMessage=n.welcomeMessage||this.cfg.welcomeMessage,!this.opts.accent&&n.color&&(this.cfg.accent=n.color,this.applyAccent());let i=this.shadow.querySelector(".hdr-name");i&&(i.textContent=this.cfg.agentName)}try{localStorage.setItem(e,JSON.stringify({sessionId:n.sessionId}))}catch{}this.showWelcome()}catch{this.started=!1,this.renderDegraded("error")}}restoreTranscriptPlaceholder(){this.sessionId?x(this.opts.apiUrl,this.sessionId).then(e=>{if(!(!e||!this.msgs)){if(e.length===0)return this.showWelcome();for(let t of e)if(t.role==="user")this.addUserBubble(t.content,!1);else{let n=this.addBotBubble(!1);n.text.textContent=t.content,this.finalizeBot(n,{messageId:t.id,citations:t.citations,answerStatus:t.answer_status},!1)}this.scrollDown()}}):this.showWelcome()}showWelcome(){let e=this.addBotBubble(!0);e.text.textContent=this.cfg.welcomeMessage,this.cfg.suggestedQuestions.length>0&&this.showChips(),this.scrollDown()}showChips(){if(!(!this.msgs||this.chipsRow)){this.chipsRow=s("div","chips");for(let e of this.cfg.suggestedQuestions){let t=s("button","chip",e);t.addEventListener("click",()=>this.send(e)),this.chipsRow.appendChild(t)}this.msgs.appendChild(this.chipsRow)}}hideChips(){var e;(e=this.chipsRow)==null||e.remove(),this.chipsRow=null}addUserBubble(e,t){this.msgs&&this.msgs.appendChild(s("div",t?"msg-user bubble-in":"msg-user",e))}addBotBubble(e){var i;let t=s("div",e?"msg-bot-wrap bubble-in":"msg-bot-wrap"),n=s("div","msg-bot");return t.appendChild(n),(i=this.msgs)==null||i.appendChild(t),{wrap:t,text:n}}showTyping(){!this.msgs||this.typingEl||(this.typingEl=s("div","typing"),this.typingEl.append(s("span"),s("span"),s("span")),this.msgs.appendChild(this.typingEl),this.scrollDown())}hideTyping(){var e;(e=this.typingEl)==null||e.remove(),this.typingEl=null}scrollDown(){this.msgs&&(this.msgs.scrollTop=this.msgs.scrollHeight)}send(e){var p;let t=(e||((p=this.input)==null?void 0:p.value)||"").trim();if(!t||this.busy||!this.sessionId)return;this.busy=!0,this.sendBtn&&(this.sendBtn.disabled=!0),this.input&&(this.input.value=""),this.hideChips(),this.addUserBubble(t,!0),this.showTyping();let n=null,i=null,a="";b(this.opts.apiUrl,this.sessionId,t,{onDelta:l=>{var o;n||(this.hideTyping(),n=this.addBotBubble(!0),i=s("span","caret"),(o=n.wrap.querySelector(".msg-bot"))==null||o.appendChild(i)),a+=l,n.text.textContent=a,i&&n.text.appendChild(i),this.scrollDown()},onDone:(l,o)=>{var d;this.hideTyping(),n||(n=this.addBotBubble(!0)),i==null||i.remove(),n.text.textContent=l||a,this.finalizeBot(n,o,!0,t),this.busy=!1,this.sendBtn&&(this.sendBtn.disabled=!1),(d=this.input)==null||d.focus(),this.scrollDown()},onError:l=>{this.hideTyping(),i==null||i.remove(),this.busy=!1,this.sendBtn&&(this.sendBtn.disabled=!1),this.renderDegraded(l==="limit"?"quota_fallback":"error",t)}})}finalizeBot(e,t,n,i){var l;let a=s("div",n?"meta bubble-in":"meta"),p=!1;if(t.citations&&t.citations.length>0){let o=s("span","meta-src"),d=s("span");d.innerHTML=g.doc,d.style.color="var(--wt3)",d.style.display="inline-flex",d.style.verticalAlign="-1px",d.style.marginRight="4px",o.appendChild(d),o.append("From: "),t.citations.forEach((h,u)=>{if(u>0&&o.append(" \xB7 "),h.url){let c=s("a",void 0,h.title);c.href=h.url,c.target="_blank",c.rel="noopener noreferrer",o.appendChild(c)}else o.append(h.title)}),a.appendChild(o),p=!0}else this.cfg.v2&&t.answerStatus==="not_in_kb"&&(a.appendChild(s("span","meta-none","Not answered from knowledge base")),p=!0);if(this.cfg.v2&&t.messageId){a.appendChild(s("span","meta-spacer"));let o=s("button","fb up");o.setAttribute("aria-label","Helpful"),o.innerHTML=g.thumb;let d=s("button","fb dn");d.setAttribute("aria-label","Not helpful"),d.innerHTML=g.thumb,(l=d.firstElementChild)==null||l.setAttribute("transform","rotate(180 0 0)");let h=(u,c,m)=>{u.classList.add("on"),c.classList.remove("on"),E(this.opts.apiUrl,t.messageId,m)};o.addEventListener("click",()=>h(o,d,"up")),d.addEventListener("click",()=>h(d,o,"down")),a.append(o,d),p=!0}p&&e.wrap.appendChild(a),this.cfg.v2&&t.answerStatus==="not_in_kb"&&i&&e.wrap.appendChild(this.buildMiniForm(i))}buildMiniForm(e){let t=s("div","mini-form"),n=s("input");n.placeholder="Your name";let i=s("input");i.placeholder="Email or phone";let a=s("button","btn-accent","Leave my details");return a.addEventListener("click",async()=>{if(!i.value.trim()){i.focus();return}if(a.disabled=!0,await v(this.opts.apiUrl,{agentId:this.opts.agentId,sessionId:this.sessionId||void 0,name:n.value.trim(),contact:i.value.trim(),message:e,source:"no_answer"})){let l=s("div","form-done"),o=s("span");o.innerHTML=g.check;let d=s("span");d.appendChild(s("strong",void 0,"Details passed to the team.")),d.append(" They\u2019ll follow up shortly."),l.append(o,d),t.replaceWith(l)}else a.disabled=!1,t.querySelector(".form-err")||t.appendChild(s("div","form-err","That didn\u2019t send \u2014 please try again."));this.scrollDown()}),t.append(n,i,a),t}renderDegraded(e,t){var h;if(!this.panel)return;for(this.degradedSource=e;this.panel.childNodes.length>1;)(h=this.panel.lastChild)==null||h.remove();this.msgs=null,this.input=null,this.chipsRow=null,this.typingEl=null;let n=s("div","degraded"),i=s("div","degraded-icon");i.innerHTML=g.mail,n.appendChild(i),n.appendChild(s("div","degraded-title","We can\u2019t answer right now")),n.appendChild(s("div","degraded-sub",`Leave your details and ${this.cfg.agentName.replace(/ (Support|Assistant)$/i,"")} will get back to you within one working day.`));let a=s("div","degraded-form"),p=s("input");p.placeholder="Your name";let l=s("input");l.placeholder="Email or phone";let o=s("textarea");o.placeholder="What would you like to ask?",o.rows=3,t&&(o.value=t);let d=s("button","btn-accent","Send message");if(d.addEventListener("click",async()=>{if(!l.value.trim()||!o.value.trim()){(l.value.trim()?o:l).focus();return}if(d.disabled=!0,await v(this.opts.apiUrl,{agentId:this.opts.agentId,sessionId:this.sessionId||void 0,name:p.value.trim(),contact:l.value.trim(),message:o.value.trim(),source:e})){let c=s("div","degraded-ok");c.appendChild(s("strong",void 0,"Thanks \u2014 message sent.")),c.appendChild(document.createElement("br")),c.append("The team will be in touch within one working day."),a.replaceWith(c)}else d.disabled=!1,a.querySelector(".form-err")||a.appendChild(s("div","form-err","That didn\u2019t send \u2014 please check your connection and try again."))}),a.append(p,l,o,d),n.appendChild(a),e!=="agent_paused"){let u=s("button","degraded-retry","Try the chat again");u.addEventListener("click",()=>{var c;for(;this.panel&&this.panel.childNodes.length>1;)(c=this.panel.lastChild)==null||c.remove();this.renderChat(),this.restoreTranscriptPlaceholder()}),n.appendChild(u)}this.panel.appendChild(n)}};async function I(r){var t;let e=(t=await C(r))!=null?t:{agentName:"Support",accent:r.accent||"#2D5A44",theme:r.theme||"light",welcomeMessage:"Hello! How can I help you today?",suggestedQuestions:[],disclaimer:"",poweredBy:!0,status:"live",v2:!1};return new y(r,e)}(()=>{let r=document.currentScript||document.querySelector("script[data-agent-id]"),e=r==null?void 0:r.dataset.agentId,t=((r==null?void 0:r.dataset.apiUrl)||"").replace(/\/+$/,"");if(!e||!t){console.error("[SupportAI] the embed script requires data-agent-id and data-api-url");return}let n=r==null?void 0:r.dataset.theme,i=(r==null?void 0:r.dataset.mode)==="inline",a=r==null?void 0:r.dataset.container,p={agentId:e,apiUrl:t,accent:r==null?void 0:r.dataset.accent,theme:n==="dark"?"dark":n==="light"?"light":void 0,inline:i},l=()=>{if(i){let o=a?document.querySelector(a):null;if(!o){console.error('[SupportAI] data-mode="inline" requires data-container pointing at an existing element');return}p.container=o}I(p)};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",l):l()})();})();
