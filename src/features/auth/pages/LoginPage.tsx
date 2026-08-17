import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/shared';
import { useAuth } from '@/app/providers/auth-provider';
import { loginApi } from '@/features/auth/api/auth.api';
import AuthLayout from '@/shared/components/layout/AuthLayout';
import Input from '@/shared/components/ui/Input';
import Button from '@/shared/components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { establishSession } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    try {
      const result = await loginApi(data);
      if (result.user && result.tokens) {
        establishSession(result.user, result.tokens);
        navigate('/');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Login failed. Please check credentials.';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-black">Welcome Back</h2>
        <p className="text-xs text-slate-500 mt-1">Access your enterprise dashboard</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          icon={<Mail size={16} />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          icon={<Lock size={16} />}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950"
            />
            <span className="text-xs font-semibold text-slate-400 select-none">Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isSubmitting}>
          Sign In
        </Button>
      </form>

      <div className="text-center mt-6 text-xs text-slate-500">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Create Organization
        </Link>
      </div>
    </AuthLayout>
  );
}
