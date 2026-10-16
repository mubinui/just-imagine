import { LearnMap } from '../../../components/learn/LearnMap';
import { learnIslands } from '../../../components/learn/content';

// A server component: the map receives only section ids and challenge ids, never pack content.
export default function Page() {
  return <LearnMap islands={learnIslands()} />;
}
