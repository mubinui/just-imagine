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
