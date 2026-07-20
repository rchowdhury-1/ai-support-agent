import { Wizard } from './Wizard';

export const metadata = { title: 'New tenant — SupportAI Operator' };

export default function OnboardingPage({ searchParams }: { searchParams: { step?: string } }) {
  const initialStep = Number.parseInt(searchParams.step ?? '1', 10) || 1;
  return <Wizard initialStep={initialStep} />;
}
