import { LessonMaterialsPage } from '../../../../../../../components/school/LessonMaterialsPage';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LessonMaterialsPage id={id} audience="teacher" />;
}
