'use client';

import { STEPS } from './onboarding-ui';
import { useWizard } from './useWizard';
import { Step1Create } from './steps/Step1Create';
import { Step2Ingest } from './steps/Step2Ingest';
import { Step3Agent } from './steps/Step3Agent';
import { Step4Sandbox } from './steps/Step4Sandbox';
import { Step5Embed } from './steps/Step5Embed';
import { Step6Billing } from './steps/Step6Billing';

/**
 * 6-step onboarding wizard, fully live against the v2 backend — started 11:20,
 * live the same day. State and backend calls live in useWizard(); each step's
 * UI lives in ./steps/*. This component is the shell: header, step chips, and
 * dispatch to the current step.
 */
export function Wizard({ initialStep, initialTenantId }: { initialStep: number; initialTenantId?: string }) {
  const w = useWizard(initialStep, initialTenantId);

  return (
    <section className="fade-up max-w-[980px]">
      <header className="pt-[26px] pb-1">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="m-0 text-[22px] font-bold tracking-[-.02em]">
            New tenant{w.bizName ? ` — ${w.bizName}` : ''}
          </h1>
          <span className="text-xs text-ink3">target: live today</span>
        </div>
      </header>

      {/* Step chips */}
      <div className="flex gap-1.5 flex-wrap pt-4 pb-5">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = n < w.step;
          const cur = n === w.step;
          return (
            <button
              key={s}
              onClick={() => (w.tenantId || n === 1 ? w.setStep(n) : undefined)}
              className="flex items-center gap-2 rounded-full text-xs font-bold px-[13px] py-[7px] cursor-pointer"
              style={{
                border: `1px solid ${cur ? 'var(--a)' : done ? 'color-mix(in srgb, var(--a) 30%, transparent)' : 'var(--b)'}`,
                background: cur ? 'var(--a)' : done ? 'var(--asf)' : 'transparent',
                color: cur ? 'var(--ai)' : done ? 'var(--a)' : 'var(--t3)',
              }}
            >
              {done ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <span className="font-mono text-[10px]">{n}</span>
              )}
              {s}
            </button>
          );
        })}
      </div>

      {w.error ? (
        <div className="mb-3 text-[12.5px] font-semibold" style={{ color: 'var(--rd)' }}>
          {w.error}
        </div>
      ) : null}

      {w.step === 1 && (
        <Step1Create
          bizName={w.bizName}
          setBizName={w.setBizName}
          contactName={w.contactName}
          setContactName={w.setContactName}
          contactEmail={w.contactEmail}
          setContactEmail={w.setContactEmail}
          creating={w.creating}
          create={w.create}
        />
      )}

      {w.step === 2 && (
        <Step2Ingest
          crawlUrl={w.crawlUrl}
          setCrawlUrl={w.setCrawlUrl}
          crawling={w.crawling}
          crawl={w.crawl}
          fileRef={w.fileRef}
          onPdfPicked={w.onPdfPicked}
          pasteText={w.pasteText}
          pages={w.pages}
          skipped={w.skipped}
          setSkipped={w.setSkipped}
          ingesting={w.ingesting}
          ingestSelected={w.ingestSelected}
          ingested={w.ingested}
          setStep={w.setStep}
        />
      )}

      {w.step === 3 && (
        <Step3Agent
          bizName={w.bizName}
          agentName={w.agentName}
          setAgentName={w.setAgentName}
          systemPrompt={w.systemPrompt}
          setSystemPrompt={w.setSystemPrompt}
          model={w.model}
          setModel={w.setModel}
          accent={w.accent}
          setAccent={w.setAccent}
          theme={w.theme}
          setTheme={w.setTheme}
          domains={w.domains}
          setDomains={w.setDomains}
          disclaimer={w.disclaimer}
          setDisclaimer={w.setDisclaimer}
          capMonthly={w.capMonthly}
          setCapMonthly={w.setCapMonthly}
          capDaily={w.capDaily}
          setCapDaily={w.setCapDaily}
          capSession={w.capSession}
          setCapSession={w.setCapSession}
          savingAgent={w.savingAgent}
          saveAgent={w.saveAgent}
        />
      )}

      {w.step === 4 && (
        <Step4Sandbox
          turns={w.turns}
          sandboxInput={w.sandboxInput}
          setSandboxInput={w.setSandboxInput}
          ask={w.ask}
          setStep={w.setStep}
        />
      )}

      {w.step === 5 && (
        <Step5Embed
          snippets={w.snippets}
          embedTab={w.embedTab}
          setEmbedTab={w.setEmbedTab}
          copied={w.copied}
          setCopied={w.setCopied}
          setStep={w.setStep}
        />
      )}

      {w.step === 6 && (
        <Step6Billing
          setupFee={w.setupFee}
          setSetupFee={w.setSetupFee}
          monthly={w.monthly}
          setMonthly={w.setMonthly}
          contactName={w.contactName}
          contactEmail={w.contactEmail}
          tenantId={w.tenantId}
          linkUrl={w.linkUrl}
          sendLink={w.sendLink}
          sendingLink={w.sendingLink}
        />
      )}
    </section>
  );
}
