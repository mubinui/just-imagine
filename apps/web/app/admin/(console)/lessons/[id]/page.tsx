import { LessonEditor } from '../../../../../components/school/Lessons';
import { AdminEmbed } from '../../../../../components/admin/AdminEmbed';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminEmbed>
      <LessonEditor id={id} admin={true} />
    </AdminEmbed>
  );
}
