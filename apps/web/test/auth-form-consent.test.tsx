import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../lib/firebase', () => ({ firebase: vi.fn(), prepareSignIn: vi.fn() }));
import { AuthForm } from '../components/AuthForm';

describe('parent consent on the auth forms', () => {
  it('is asked when creating an account', () => {
    expect(renderToStaticMarkup(<AuthForm signup />)).toContain('type="checkbox"');
  });
  it('is not asked when signing in to an existing account', () => {
    expect(renderToStaticMarkup(<AuthForm />)).not.toContain('type="checkbox"');
  });
});

import { ConsentStep } from '../components/ConsentStep';
import { s } from '../lib/strings/en';

describe('the new-account consent step after signing in', () => {
  const step = (error = '') =>
    renderToStaticMarkup(
      <ConsentStep
        email="parent@example.com"
        consent={false}
        busy={false}
        error={error}
        onConsent={() => {}}
        onCreate={() => {}}
        onOtherAccount={() => {}}
      />,
    );
  it('is titled as account creation, not sign in', () => {
    const html = step();
    expect(html).toContain(`<h1>${s.signUp}</h1>`);
    expect(html).not.toContain(s.signIn);
  });
  it('explains the step as a calm lead, not as an error, and names the account', () => {
    const html = step();
    expect(html).toContain(`<p class="consent-step-lead">${s.newAccountConsent}</p>`);
    expect(html).not.toContain('role="alert"');
    expect(html).toContain('parent@example.com');
  });
  it('offers one way forward and a way back, and never a second create link', () => {
    const html = step();
    expect(html).toContain(s.createFamilyAccount);
    expect(html).toContain(s.parentGateOther);
    expect(html).not.toContain('href="/sign-up"');
  });
  it('shows a real problem as an alert', () => {
    expect(step(s.consentRequired)).toContain('role="alert"');
  });
});
