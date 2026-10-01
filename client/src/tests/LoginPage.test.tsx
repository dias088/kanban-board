import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context';
import { LoginPage } from '@/features/auth/LoginPage';

function renderLoginPage() {
  const login = vi.fn<AuthContextValue['login']>().mockResolvedValue(undefined);
  const startDemo = vi.fn<AuthContextValue['startDemo']>().mockResolvedValue(undefined);

  const value: AuthContextValue = {
    user: null,
    status: 'anonymous',
    login,
    register: vi.fn(),
    startDemo,
    logout: vi.fn(),
  };

  render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <LoginPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

  return { login, startDemo, user: userEvent.setup() };
}

describe('LoginPage', () => {
  it('shows a validation message and does not call the API for a malformed email', async () => {
    const { login, user } = renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'some-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(login).not.toHaveBeenCalled();
  });

  it('refuses to submit an empty password', async () => {
    const { login, user } = renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'grace@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Password is required');
    expect(login).not.toHaveBeenCalled();
  });

  it('submits the email normalised by the shared schema', async () => {
    const { login, user } = renderLoginPage();

    await user.type(screen.getByLabelText('Email'), '  Grace@Example.COM  ');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // The client does not re-implement the rules: trimming and lower-casing
    // come from the same zod schema the server validates with
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'grace@example.com',
        password: 'correct-horse-battery',
      });
    });
  });

  it('starts a demo sandbox without asking for credentials', async () => {
    const { startDemo, login, user } = renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Try the demo' }));

    await waitFor(() => expect(startDemo).toHaveBeenCalledTimes(1));
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the server message when the credentials are rejected', async () => {
    const { login, user } = renderLoginPage();
    const { ApiError } = await import('@/lib/api');

    login.mockRejectedValueOnce(
      new ApiError(401, { code: 'UNAUTHORIZED', message: 'Invalid email or password' }),
    );

    await user.type(screen.getByLabelText('Email'), 'grace@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});
