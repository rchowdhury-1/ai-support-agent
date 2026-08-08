import { escalate, fetchConfig, loadHistory, sendFeedback, sendMessage, startSession } from './api';
import { css } from './styles';
import type { AgentConfig, AnswerMeta, WidgetOptions } from './types';

const STORAGE_PREFIX = 'supportai_v2_';
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@1,6..72,400..600&family=Schibsted+Grotesk:wght@400;600;700&display=swap';

// Static, trusted SVG fragments (never interpolated with user data).
const ICONS = {
  chat: '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-4.4A8.4 8.4 0 1 1 21 11.5z"></path></svg>',
  close: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>',
  send: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4z"></path></svg>',
  doc: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>',
  thumb: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h9.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3H14z"></path><path d="M6 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2"></path></svg>',
  check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2F7D4F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',
  mail: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H8l-4 4z"></path><path d="M12 8v3"></path><path d="M12 13.5v.01"></path></svg>',
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length < 6) return 0.3;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

type DegradedSource = 'quota_fallback' | 'agent_paused' | 'error';

export class Widget {
  private opts: WidgetOptions;
  private cfg: AgentConfig;
  private shadow: ShadowRoot;
  private root: HTMLDivElement;
  private panel: HTMLDivElement | null = null;
  private launcher: HTMLButtonElement;
  private msgs: HTMLDivElement | null = null;
  private chipsRow: HTMLDivElement | null = null;
  private typingEl: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;
  private sessionId: string | null = null;
  private busy = false;
  private started = false;
  private readonly inline: boolean;

  constructor(opts: WidgetOptions, cfg: AgentConfig) {
    this.opts = opts;
    this.cfg = cfg;
    this.inline = !!(opts.inline && opts.container);

    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }

    const host = document.createElement('div');
    host.id = 'supportai-widget';
    this.shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = css;
    this.shadow.appendChild(style);

    let rootClass = this.cfg.theme === 'dark' ? 'root dark' : 'root';
    if (this.inline) rootClass += ' inline';
    this.root = el('div', rootClass);
    this.applyAccent();
    this.shadow.appendChild(this.root);

    this.launcher = el('button', 'launcher');
    this.launcher.setAttribute('aria-label', 'Open support chat');
    this.launcher.innerHTML = ICONS.chat;
    this.launcher.addEventListener('click', () => this.toggle());

    if (this.inline) {
      host.style.display = 'block';
      host.style.width = '100%';
      host.style.height = '100%';
      opts.container!.appendChild(host);
      this.openPanel();
    } else {
      this.root.appendChild(this.launcher);
      document.body.appendChild(host);
    }
  }

  private applyAccent(): void {
    this.root.style.setProperty('--wa', this.cfg.accent);
    this.root.style.setProperty('--wai', luminance(this.cfg.accent) > 0.55 ? '#1E2420' : '#F7F3E8');
  }

  // ── Panel lifecycle ─────────────────────────────────────

  private toggle(): void {
    if (this.panel) return this.closePanel();
    this.openPanel();
  }

  private openPanel(): void {
    this.launcher.style.display = 'none';
    this.panel = el('div', 'panel');
    this.panel.appendChild(this.buildHeader());
    if (this.inline) this.root.appendChild(this.panel);
    else this.root.insertBefore(this.panel, this.launcher);

    if (this.cfg.status === 'paused') {
      this.renderDegraded('agent_paused');
      return;
    }
    this.renderChat();
    void this.ensureSession();
  }

  private closePanel(): void {
    if (this.inline) return; // inline demo has nothing to collapse into
    this.panel?.remove();
    this.panel = null;
    this.msgs = null;
    this.input = null;
    this.launcher.style.display = '';
    this.launcher.focus();
  }

  private buildHeader(): HTMLDivElement {
    const hdr = el('div', 'hdr');
    const avatar = el('div', 'hdr-avatar', (this.cfg.agentName || 'S').trim().charAt(0));
    const info = el('div', 'hdr-info');
    info.appendChild(el('div', 'hdr-name', this.cfg.agentName));
    const status = el('div', 'hdr-status');
    status.appendChild(el('span', 'hdr-dot'));
    status.appendChild(el('span', undefined, this.cfg.status === 'paused' ? 'Leave a message' : 'Online — answers in seconds'));
    info.appendChild(status);
    hdr.append(avatar, info);
    if (!this.inline) {
      const close = el('button', 'hdr-close');
      close.setAttribute('aria-label', 'Minimise chat');
      close.innerHTML = ICONS.close;
      close.addEventListener('click', () => this.closePanel());
      hdr.appendChild(close);
    }
    return hdr;
  }

  // ── Chat mode ───────────────────────────────────────────

  private renderChat(): void {
    if (!this.panel) return;

    this.msgs = el('div', 'msgs');
    this.msgs.setAttribute('aria-live', 'polite');
    this.panel.appendChild(this.msgs);

    const composer = el('div', 'composer');
    const row = el('div', 'composer-row');
    this.input = el('input');
    this.input.placeholder = 'Ask a question…';
    this.input.setAttribute('aria-label', 'Ask a question');
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.send();
    });
    this.sendBtn = el('button', 'send');
    this.sendBtn.setAttribute('aria-label', 'Send');
    this.sendBtn.innerHTML = ICONS.send;
    this.sendBtn.addEventListener('click', () => this.send());
    row.append(this.input, this.sendBtn);
    composer.appendChild(row);

    const footer = el('div', 'footer-row');
    footer.appendChild(el('span', 'disclaimer', this.cfg.disclaimer));
    if (this.cfg.poweredBy) {
      const p = el('span', 'powered');
      p.append('Powered by ');
      p.appendChild(el('strong', undefined, 'SupportAI'));
      footer.appendChild(p);
    }
    composer.appendChild(footer);
    this.panel.appendChild(composer);
    this.input.focus();
  }

  private async ensureSession(): Promise<void> {
    if (this.started) {
      this.restoreTranscriptPlaceholder();
      return;
    }
    this.started = true;

    const key = STORAGE_PREFIX + this.opts.agentId;
    let saved: string | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) saved = (JSON.parse(raw) as { sessionId?: string }).sessionId || null;
    } catch { /* storage unavailable */ }

    if (saved) {
      const history = await loadHistory(this.opts.apiUrl, saved);
      if (history) {
        this.sessionId = saved;
        if (history.length === 0) this.showWelcome();
        for (const m of history) {
          if (m.role === 'user') this.addUserBubble(m.content, false);
          else {
            const b = this.addBotBubble(false);
            b.text.textContent = m.content;
            this.finalizeBot(b, {
              messageId: m.id,
              citations: m.citations,
              answerStatus: m.answer_status,
            }, false);
          }
        }
        this.scrollDown();
        return;
      }
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }

    try {
      const session = await startSession(this.opts);
      this.sessionId = session.sessionId;
      // v1 bootstrap fills gaps the config endpoint couldn't (v1 backend).
      if (!this.cfg.v2) {
        this.cfg.agentName = session.agentName || this.cfg.agentName;
        this.cfg.welcomeMessage = session.welcomeMessage || this.cfg.welcomeMessage;
        if (!this.opts.accent && session.color) {
          this.cfg.accent = session.color;
          this.applyAccent();
        }
        const name = this.shadow.querySelector('.hdr-name');
        if (name) name.textContent = this.cfg.agentName;
      }
      try { localStorage.setItem(key, JSON.stringify({ sessionId: session.sessionId })); } catch { /* ignore */ }
      this.showWelcome();
    } catch {
      this.started = false;
      this.renderDegraded('error');
    }
  }

  private restoreTranscriptPlaceholder(): void {
    // Panel was closed and reopened within one page life: rebuild from history.
    if (this.sessionId) {
      void loadHistory(this.opts.apiUrl, this.sessionId).then((history) => {
        if (!history || !this.msgs) return;
        if (history.length === 0) return this.showWelcome();
        for (const m of history) {
          if (m.role === 'user') this.addUserBubble(m.content, false);
          else {
            const b = this.addBotBubble(false);
            b.text.textContent = m.content;
            this.finalizeBot(b, { messageId: m.id, citations: m.citations, answerStatus: m.answer_status }, false);
          }
        }
        this.scrollDown();
      });
    } else {
      this.showWelcome();
    }
  }

  private showWelcome(): void {
    const b = this.addBotBubble(true);
    b.text.textContent = this.cfg.welcomeMessage;
    if (this.cfg.suggestedQuestions.length > 0) this.showChips();
    this.scrollDown();
  }

  private showChips(): void {
    if (!this.msgs || this.chipsRow) return;
    this.chipsRow = el('div', 'chips');
    for (const q of this.cfg.suggestedQuestions) {
      const chip = el('button', 'chip', q);
      chip.addEventListener('click', () => this.send(q));
      this.chipsRow.appendChild(chip);
    }
    this.msgs.appendChild(this.chipsRow);
  }

  private hideChips(): void {
    this.chipsRow?.remove();
    this.chipsRow = null;
  }

  // ── Bubbles ─────────────────────────────────────────────

  private addUserBubble(text: string, animate: boolean): void {
    if (!this.msgs) return;
    this.msgs.appendChild(el('div', animate ? 'msg-user bubble-in' : 'msg-user', text));
  }

  private addBotBubble(animate: boolean): { wrap: HTMLDivElement; text: HTMLDivElement } {
    const wrap = el('div', animate ? 'msg-bot-wrap bubble-in' : 'msg-bot-wrap');
    const text = el('div', 'msg-bot');
    wrap.appendChild(text);
    this.msgs?.appendChild(wrap);
    return { wrap, text };
  }

  private showTyping(): void {
    if (!this.msgs || this.typingEl) return;
    this.typingEl = el('div', 'typing');
    this.typingEl.append(el('span'), el('span'), el('span'));
    this.msgs.appendChild(this.typingEl);
    this.scrollDown();
  }

  private hideTyping(): void {
    this.typingEl?.remove();
    this.typingEl = null;
  }

  private scrollDown(): void {
    if (this.msgs) this.msgs.scrollTop = this.msgs.scrollHeight;
  }

  // ── Sending ─────────────────────────────────────────────

  private send(textOverride?: string): void {
    const text = (textOverride || this.input?.value || '').trim();
    if (!text || this.busy || !this.sessionId) return;
    this.busy = true;
    if (this.sendBtn) this.sendBtn.disabled = true;
    if (this.input) this.input.value = '';
    this.hideChips();
    this.addUserBubble(text, true);
    this.showTyping();

    let bubble: { wrap: HTMLDivElement; text: HTMLDivElement } | null = null;
    let caret: HTMLSpanElement | null = null;
    let acc = '';

    void sendMessage(this.opts.apiUrl, this.sessionId, text, {
      onDelta: (delta) => {
        if (!bubble) {
          this.hideTyping();
          bubble = this.addBotBubble(true);
          caret = el('span', 'caret');
          bubble.wrap.querySelector('.msg-bot')?.appendChild(caret);
        }
        acc += delta;
        bubble.text.textContent = acc;
        if (caret) bubble.text.appendChild(caret);
        this.scrollDown();
      },
      onDone: (full, meta) => {
        this.hideTyping();
        if (!bubble) bubble = this.addBotBubble(true);
        caret?.remove();
        bubble.text.textContent = full || acc;
        this.finalizeBot(bubble, meta, true, text);
        this.busy = false;
        if (this.sendBtn) this.sendBtn.disabled = false;
        this.input?.focus();
        this.scrollDown();
      },
      onError: (kind) => {
        this.hideTyping();
        caret?.remove();
        this.busy = false;
        if (this.sendBtn) this.sendBtn.disabled = false;
        this.renderDegraded(kind === 'limit' ? 'quota_fallback' : 'error', text);
      },
    });
  }

  private finalizeBot(
    bubble: { wrap: HTMLDivElement; text: HTMLDivElement },
    meta: AnswerMeta,
    animate: boolean,
    /** The visitor's question — present only on live sends; enables the inline details form. */
    userQuestion?: string
  ): void {
    const meta_row = el('div', animate ? 'meta bubble-in' : 'meta');
    let hasMeta = false;

    if (meta.citations && meta.citations.length > 0) {
      const src = el('span', 'meta-src');
      const icon = el('span');
      icon.innerHTML = ICONS.doc;
      icon.style.color = 'var(--wt3)';
      icon.style.display = 'inline-flex';
      icon.style.verticalAlign = '-1px';
      icon.style.marginRight = '4px';
      src.appendChild(icon);
      src.append('From: ');
      meta.citations.forEach((c, i) => {
        if (i > 0) src.append(' · ');
        if (c.url) {
          const a = el('a', undefined, c.title);
          a.href = c.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          src.appendChild(a);
        } else {
          src.append(c.title);
        }
      });
      meta_row.appendChild(src);
      hasMeta = true;
    } else if (this.cfg.v2 && meta.answerStatus === 'not_in_kb') {
      meta_row.appendChild(el('span', 'meta-none', 'Not answered from knowledge base'));
      hasMeta = true;
    }

    if (this.cfg.v2 && meta.messageId) {
      meta_row.appendChild(el('span', 'meta-spacer'));
      const up = el('button', 'fb up');
      up.setAttribute('aria-label', 'Helpful');
      up.innerHTML = ICONS.thumb;
      const down = el('button', 'fb dn');
      down.setAttribute('aria-label', 'Not helpful');
      down.innerHTML = ICONS.thumb;
      (down.firstElementChild as SVGElement | null)?.setAttribute('transform', 'rotate(180 0 0)');
      const pick = (btn: HTMLButtonElement, other: HTMLButtonElement, rating: 'up' | 'down') => {
        btn.classList.add('on');
        other.classList.remove('on');
        sendFeedback(this.opts.apiUrl, meta.messageId!, rating);
      };
      up.addEventListener('click', () => pick(up, down, 'up'));
      down.addEventListener('click', () => pick(down, up, 'down'));
      meta_row.append(up, down);
      hasMeta = true;
    }

    if (hasMeta) bubble.wrap.appendChild(meta_row);

    // Honest refusal → inline details form (the escalation moment).
    // The escalation carries the visitor's unanswered question, not the refusal text.
    if (this.cfg.v2 && meta.answerStatus === 'not_in_kb' && userQuestion) {
      bubble.wrap.appendChild(this.buildMiniForm(userQuestion));
    }
  }

  private buildMiniForm(question: string): HTMLDivElement {
    const form = el('div', 'mini-form');
    const name = el('input');
    name.placeholder = 'Your name';
    const contact = el('input');
    contact.placeholder = 'Email or phone';
    const btn = el('button', 'btn-accent', 'Leave my details');
    btn.addEventListener('click', async () => {
      if (!contact.value.trim()) { contact.focus(); return; }
      btn.disabled = true;
      const ok = await escalate(this.opts.apiUrl, {
        agentId: this.opts.agentId,
        sessionId: this.sessionId || undefined,
        name: name.value.trim(),
        contact: contact.value.trim(),
        message: question,
        source: 'no_answer',
      });
      if (ok) {
        const done = el('div', 'form-done');
        const icon = el('span');
        icon.innerHTML = ICONS.check;
        const msg = el('span');
        msg.appendChild(el('strong', undefined, 'Details passed to the team.'));
        msg.append(' They’ll follow up shortly.');
        done.append(icon, msg);
        form.replaceWith(done);
      } else {
        btn.disabled = false;
        if (!form.querySelector('.form-err')) {
          form.appendChild(el('div', 'form-err', 'That didn’t send — please try again.'));
        }
      }
      this.scrollDown();
    });
    form.append(name, contact, btn);
    return form;
  }

  // ── Degraded mode — polite contact form, never an error ─

  private renderDegraded(source: DegradedSource, pendingQuestion?: string): void {
    if (!this.panel) return;
    while (this.panel.childNodes.length > 1) this.panel.lastChild?.remove(); // keep header
    this.msgs = null;
    this.input = null;
    this.chipsRow = null;
    this.typingEl = null;

    const body = el('div', 'degraded');
    const icon = el('div', 'degraded-icon');
    icon.innerHTML = ICONS.mail;
    body.appendChild(icon);
    body.appendChild(el('div', 'degraded-title', 'We can’t answer right now'));
    body.appendChild(
      el('div', 'degraded-sub', `Leave your details and ${this.cfg.agentName.replace(/ (Support|Assistant)$/i, '')} will get back to you within one working day.`)
    );

    const form = el('div', 'degraded-form');
    const name = el('input');
    name.placeholder = 'Your name';
    const contact = el('input');
    contact.placeholder = 'Email or phone';
    const message = el('textarea');
    message.placeholder = 'What would you like to ask?';
    message.rows = 3;
    if (pendingQuestion) message.value = pendingQuestion;
    const btn = el('button', 'btn-accent', 'Send message');
    btn.addEventListener('click', async () => {
      if (!contact.value.trim() || !message.value.trim()) {
        (contact.value.trim() ? message : contact).focus();
        return;
      }
      btn.disabled = true;
      const ok = await escalate(this.opts.apiUrl, {
        agentId: this.opts.agentId,
        sessionId: this.sessionId || undefined,
        name: name.value.trim(),
        contact: contact.value.trim(),
        message: message.value.trim(),
        source,
      });
      if (ok) {
        const done = el('div', 'degraded-ok');
        done.appendChild(el('strong', undefined, 'Thanks — message sent.'));
        done.appendChild(document.createElement('br'));
        done.append('The team will be in touch within one working day.');
        form.replaceWith(done);
      } else {
        btn.disabled = false;
        if (!form.querySelector('.form-err')) {
          form.appendChild(el('div', 'form-err', 'That didn’t send — please check your connection and try again.'));
        }
      }
    });
    form.append(name, contact, message, btn);
    body.appendChild(form);

    // Transient failures deserve a way back into chat; a paused agent does not.
    if (source !== 'agent_paused') {
      const retry = el('button', 'degraded-retry', 'Try the chat again');
      retry.addEventListener('click', () => {
        while (this.panel && this.panel.childNodes.length > 1) this.panel.lastChild?.remove();
        this.renderChat();
        this.restoreTranscriptPlaceholder();
      });
      body.appendChild(retry);
    }

    this.panel.appendChild(body);
  }
}

export async function createWidget(opts: WidgetOptions): Promise<Widget> {
  const cfg =
    (await fetchConfig(opts)) ??
    ({
      agentName: 'Support',
      accent: opts.accent || '#2D5A44',
      theme: opts.theme || 'light',
      welcomeMessage: 'Hello! How can I help you today?',
      suggestedQuestions: [],
      disclaimer: '',
      poweredBy: true,
      status: 'live',
      v2: false,
    } as AgentConfig);
  return new Widget(opts, cfg);
}
