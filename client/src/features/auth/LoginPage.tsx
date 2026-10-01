import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@kanban/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError, apiErrorMessage } from '@/lib/api';
import { useAuth } from './auth-context';
import { AuthCard } from './AuthCard';

export function LoginPage() {
  const { login, startDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [startingDemo, setStartingDemo] = useState(false);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await login(values);
      // Return to whatever was being opened before the redirect to /login
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/boards', { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : 'Could not reach the server, please try again',
      );
    }
  });

  return (
    <AuthCard
      title="Sign in"
      subtitle="Pick up your boards where you left them."
      footer={{ prompt: 'No account yet?', linkLabel: 'Create one', to: '/register' }}
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        {submitError && (
          <p role="alert" className="text-sm text-danger">
            {submitError}
          </p>
        )}

        <Button type="submit" loading={form.formState.isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="mt-4 border-t border-border pt-4">
        <Button
          variant="secondary"
          className="w-full"
          loading={startingDemo}
          onClick={() => {
            setStartingDemo(true);
            setSubmitError(null);

            startDemo()
              .then(() => navigate('/boards', { replace: true }))
              .catch((error: unknown) => {
                setSubmitError(
                  apiErrorMessage(error, 'Could not start the demo, please try again'),
                );
              })
              .finally(() => setStartingDemo(false));
          }}
        >
          Try the demo
        </Button>
        <p className="mt-2 text-center text-xs text-content-muted">
          Opens a private sandbox with a sample board. No sign-up, nothing shared with anyone else.
        </p>
      </div>
    </AuthCard>
  );
}
