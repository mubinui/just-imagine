import { Header, Footer } from '../../components/Shell';
import { s } from '../../lib/strings/en';
export default function Privacy() {
  return (
    <>
      <Header />
      <main className="prose">
        <h1>{s.privacy}</h1>
        <p>{s.privacyBody}</p>
        <h2>Optional photo companions</h2>
        <p>
          A parent or guardian can choose a ready-made friend or send a photo to Gemini to create a
          chibi avatar. The app removes photo metadata and does not save the original photo. The
          generated artwork is stored in the private child profile and is removed when the profile
          or account is deleted, or replaced when a different companion is saved. Processing by
          Gemini is subject to the selected provider service and its data terms.
        </p>
        <p>
          The companion is an AI play friend. Voice navigation opens child screens; parent settings
          and payments stay in the parent area. Microphone access requires your browser permission,
          and you can stop the conversation.
        </p>
      </main>
      <Footer />
    </>
  );
}
