import { notFound } from 'next/navigation';
import { LearnSection } from '../../../../components/learn/LearnSection';
import { learnIslands, sectionPacks } from '../../../../components/learn/content';

// A server component: packs are stripped of answer keys, accepted answers and hints here, so they
// never reach the browser (spec 6b; test/learn-content.test.ts).
export function generateStaticParams() {
  return learnIslands()
    .filter((island) => island.open)
    .map((island) => ({ pack: island.section }));
}

export default async function Page({ params }: { params: Promise<{ pack: string }> }) {
  const { pack } = await params;
  const packs = sectionPacks(pack);
  if (!packs.length) notFound();
  return <LearnSection packs={packs} />;
}
