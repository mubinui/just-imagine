import { writeFileSync } from 'node:fs';
import { adminAuth, db, newId } from '../packages/server-core/src/index';
import {
  SchoolDocSchema,
  SchoolClassDocSchema,
  StudentDocSchema,
  schoolPaths,
  studentUid,
} from '../packages/protocol/src/index';
import { DEMO_LESSONS } from '../services/api/src/school/demo-lessons';
import { secret, freshPin } from '../services/api/src/school/common';
import { validateLesson } from '../services/api/src/school/lessons';
if (!process.env['FIRESTORE_EMULATOR_HOST'] && !process.argv.includes('--staging'))
  throw new Error('Select an emulator or explicitly pass --staging.');
if (!(process.env['GOOGLE_CLOUD_PROJECT'] ?? process.env['GCLOUD_PROJECT']))
  throw new Error('Set GOOGLE_CLOUD_PROJECT explicitly.');
const marker = db().doc('schoolSeeds/demo'),
  existing = await marker.get(),
  sid = existing.exists ? String(existing.get('schoolId')) : newId('s');
const code = 'DH2K99',
  email = 'teacher@justimagine.test';
let teacher,
  createdTeacher = false;
try {
  teacher = await adminAuth().getUserByEmail(email);
} catch (e) {
  if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
  const password = process.env['SCHOOL_DEMO_PASSWORD'];
  if (!password || password.length < 12)
    throw new Error(
      'Set SCHOOL_DEMO_PASSWORD to at least12 characters when creating the demo teacher.',
    );
  teacher = await adminAuth().createUser({ email, password, emailVerified: true });
  createdTeacher = true;
}
const [family, principal] = await Promise.all([
  db()
    .doc('users/' + teacher.uid)
    .get(),
  db()
    .doc('schoolPrincipals/' + teacher.uid)
    .get(),
]);
if (family.exists)
  throw new Error(
    'The demo teacher email belongs to a family account. No role or credentials were changed.',
  );
if (teacher.customClaims?.['admin'] === true)
  throw new Error(
    'The demo teacher email belongs to an operator. No role or credentials were changed.',
  );
const role = teacher.customClaims?.['role'];
if (role && !(role === 'schoolAdmin' && teacher.customClaims?.['schoolId'] === sid))
  throw new Error(
    'The demo teacher account belongs to a different school or role. No role or credentials were changed.',
  );
if (
  principal.exists &&
  (principal.get('role') !== 'schoolAdmin' || principal.get('schoolId') !== sid)
)
  throw new Error(
    'The demo teacher principal is already bound elsewhere. No role or credentials were changed.',
  );
if (existing.exists && !process.argv.includes('--refresh-lessons')) {
  const member = await db().doc(schoolPaths.member(sid, teacher.uid)).get();
  if (!member.exists || member.get('email') !== email)
    throw new Error(
      'The seed marker and teacher membership disagree. An operator must repair them.',
    );
  await adminAuth().setCustomUserClaims(teacher.uid, {
    ...teacher.customClaims,
    role: 'schoolAdmin',
    schoolId: sid,
  });
  console.log(
    'School demo already exists; roster, PINs and existing teacher credentials were preserved. Use --refresh-lessons to update only lesson content.',
  );
  process.exit(0);
}
for (const entry of DEMO_LESSONS) validateLesson(entry.lesson, entry.keys, true);
const lessonIds: Record<string, string> = existing.get('lessonIds') ?? {},
  batch = db().batch();
for (const entry of DEMO_LESSONS) {
  const id = lessonIds[entry.slug] ?? newId('w');
  lessonIds[entry.slug] = id;
  batch.set(db().doc(schoolPaths.lesson(id)), { ...entry.lesson, updatedAt: Date.now() });
  batch.set(db().doc(schoolPaths.lessonKeys(id)), entry.keys);
}
const pins: { firstName: string; schoolCode: string; username: string; pin: string }[] = [];
if (!existing.exists) {
  const codeRef = db().doc(schoolPaths.schoolCode(code));
  if ((await codeRef.get()).exists) throw new Error('The demo code already belongs to a school.');
  batch.create(
    db().doc(schoolPaths.school(sid)),
    SchoolDocSchema.parse({
      name: 'Dhaka Demo High School',
      nameBn: 'ঢাকা ডেমো উচ্চ বিদ্যালয়',
      code,
      status: 'active',
      seats: 60,
      voiceSecondsPerDay: 7200,
      createdAt: Date.now(),
    }),
  );
  batch.create(codeRef, { schoolId: sid });
  batch.set(db().doc('schoolPrincipals/' + teacher.uid), {
    role: 'schoolAdmin',
    schoolId: sid,
    createdAt: Date.now(),
  });
  batch.create(db().doc(schoolPaths.member(sid, teacher.uid)), {
    role: 'schoolAdmin',
    email,
    displayName: 'Demo teacher',
    joinedAt: Date.now(),
  });
  const classes = [newId('c'), newId('c')];
  classes.forEach((id, i) =>
    batch.create(
      db().doc(schoolPaths.schoolClass(sid, id)),
      SchoolClassDocSchema.parse({
        grade: i === 0 ? 9 : 10,
        section: 'A',
        name: i === 0 ? '9-A' : '10-A',
        boardsVisible: true,
        createdAt: Date.now(),
      }),
    ),
  );
  for (let i = 0; i < 30; i++) {
    const id = newId('c'),
      pin = freshPin(),
      username = 'student' + String(i + 1).padStart(2, '0');
    batch.set(db().doc('schoolPrincipals/' + studentUid(sid, id)), {
      role: 'student',
      schoolId: sid,
      studentId: id,
      createdAt: Date.now(),
    });
    batch.create(
      db().doc(schoolPaths.student(sid, id)),
      StudentDocSchema.parse({
        firstName: 'শিক্ষার্থী ' + String(i + 1),
        username,
        classId: classes[i % 2],
        avatar: 'fox',
        language: 'bn',
        pointsAll: 0,
        pointsWeek: null,
        createdAt: Date.now(),
      }),
    );
    batch.create(db().doc(schoolPaths.studentSecret(sid, id)), await secret(pin));
    pins.push({ firstName: 'শিক্ষার্থী ' + String(i + 1), schoolCode: code, username, pin });
  }
}
batch.set(marker, { schoolId: sid, teacherUid: teacher.uid, lessonIds, updatedAt: Date.now() });
await batch.commit();
// Firestore membership/marker is committed first; a rerun can repair a failed claims write.
await adminAuth().setCustomUserClaims(teacher.uid, {
  ...teacher.customClaims,
  role: 'schoolAdmin',
  schoolId: sid,
});
if (pins.length) {
  const output = process.env['SCHOOL_PIN_OUTPUT'] ?? '/tmp/just-imagine-school-pins.json';
  writeFileSync(output, JSON.stringify(pins, null, 2), { mode: 0o600 });
  console.log('One-time student PIN sheet written with owner-only permissions to ' + output + '.');
}
console.log(
  'Seeded seven bilingual school lessons. ' +
    (createdTeacher
      ? 'Created the demo teacher using SCHOOL_DEMO_PASSWORD.'
      : 'Existing teacher credentials were preserved.') +
    ' Family data was not changed.',
);
