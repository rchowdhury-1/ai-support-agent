/** Pure DOM view builders for the widget — no widget state, only inputs + callbacks. */
import { escalate } from './api';
import { ICONS, el } from './dom';
import type { AgentConfig, WidgetOptions } from './types';

/** The panel header (avatar, name, status, and — unless inline — a close button). */
export function buildHeader(cfg: AgentConfig, inline: boolean, onClose: () => void): HTMLDivElement {
  const hdr = el('div', 'hdr');
  const avatar = el('div', 'hdr-avatar', (cfg.agentName || 'S').trim().charAt(0));
  const info = el('div', 'hdr-info');
  info.appendChild(el('div', 'hdr-name', cfg.agentName));
  const status = el('div', 'hdr-status');
  status.appendChild(el('span', 'hdr-dot'));
  status.appendChild(el('span', undefined, cfg.status === 'paused' ? 'Leave a message' : 'Online — answers in seconds'));
  info.appendChild(status);
  hdr.append(avatar, info);
  if (!inline) {
    const close = el('button', 'hdr-close');
    close.setAttribute('aria-label', 'Minimise chat');
    close.innerHTML = ICONS.close;
    close.addEventListener('click', onClose);
    hdr.appendChild(close);
  }
  return hdr;
}

/** The inline "leave your details" form shown under an unanswered answer. */
export function buildContactForm(
  opts: WidgetOptions,
  sessionId: string | null,
  question: string,
  onScrolled: () => void
): HTMLDivElement {
  const form = el('div', 'mini-form');
  const name = el('input');
  name.placeholder = 'Your name';
  const contact = el('input');
  contact.placeholder = 'Email or phone';
  const btn = el('button', 'btn-accent', 'Leave my details');
  btn.addEventListener('click', async () => {
    if (!contact.value.trim()) { contact.focus(); return; }
    btn.disabled = true;
    const ok = await escalate(opts.apiUrl, {
      agentId: opts.agentId,
      sessionId: sessionId || undefined,
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
    onScrolled();
  });
  form.append(name, contact, btn);
  return form;
}
