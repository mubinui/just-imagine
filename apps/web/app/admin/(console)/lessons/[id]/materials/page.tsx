import { LessonMaterialsPage } from '../../../../../../components/school/LessonMaterialsPage';
import { AdminEmbed } from '../../../../../../components/admin/AdminEmbed';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminEmbed>
      <LessonMaterialsPage id={id} audience="admin" />
    </AdminEmbed>
  );
}
