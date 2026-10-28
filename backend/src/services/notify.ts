/**
 * Lead-notification delivery. Email today via Resend; webhook and WhatsApp
 * channels are additional `type`s on the same notification_channels table
 * (see migration 002) and get their own send functions when built. Channel
 * lookup and the enquiries insert stay in chat-support.ts (createEnquiry) —
 * this module only knows how to deliver, not who should receive.
 */
import { Resend } from 'resend';

export interface EnquiryNotification {
  agentName: string;
  leadName: string;
  contact: string;
  question: string;
  intent: string | null;
}

let resendClient: Resend | null = null;
function client(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

const FROM_ADDRESS = process.env.NOTIFICATION_FROM_EMAIL ?? 'SupportAI Leads <leads@supportai.dev>';

function formatEmailBody(e: EnquiryNotification): string {
  const intentLine = e.intent && e.intent !== 'none' ? `Regarding: ${e.intent}\n` : '';
  return `New enquiry from your ${e.agentName} widget.\n\n${intentLine}Name: ${e.leadName}\nContact: ${e.contact}\n\n${e.question}`;
}

/** Best-effort — a delivery failure must never break the chat turn that raised it. */
export async function sendEnquiryEmail(to: string, enquiry: EnquiryNotification): Promise<void> {
  const resend = client();
  if (!resend) {
    console.error('notify: RESEND_API_KEY not configured, skipping enquiry email');
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `New enquiry — ${enquiry.agentName}`,
    text: formatEmailBody(enquiry),
  });
  if (error) console.error('notify: enquiry email failed:', error);
}
