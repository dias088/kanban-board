import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { PASSWORD_MIN_LENGTH, registerSchema } from '@kanban/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { useAuth } from './auth-context';
import { AuthCard } from './AuthCard';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await register(values);
      navigate('/boards', { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : 'Could not reach the server, please try again',
      );
    }
  });

  return (
    <AuthCard
      title="Create an account"
      subtitle="One account, as many boards as you need."
      footer={{ prompt: 'Already registered?', linkLabel: 'Sign in', to: '/login' }}
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Input
          label="Name"
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />

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
          autoComplete="new-password"
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        {submitError && (
          <p role="alert" className="text-sm text-danger">
            {submitError}
          </p>
        )}

        <Button type="submit" loading={form.formState.isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
