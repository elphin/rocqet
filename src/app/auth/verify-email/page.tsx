'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, AlertCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [email, setEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Get the email from localStorage (set during signup)
    const userEmail = localStorage.getItem('pendingVerificationEmail');
    if (userEmail) {
      setEmail(userEmail);
    }
  }, []);

  const handleResendVerification = async () => {
    if (!email) return;
    
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      setResendError(error.message);
    } else {
      setResendSuccess(true);
    }
    
    setIsResending(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-100 p-3">
            <Mail className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Check your email</h1>
          <p className="mt-2 text-gray-600">
            We've sent a verification email to
          </p>
          {email && (
            <p className="mt-1 font-medium text-gray-900">{email}</p>
          )}
        </div>

        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            Please click the link in the email to verify your account. 
            You may need to check your spam folder.
          </p>
        </div>

        {resendSuccess && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 p-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">
              Verification email has been resent!
            </p>
          </div>
        )}

        {resendError && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{resendError}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={handleResendVerification}
            disabled={isResending || !email}
            variant="outline"
            className="w-full"
          >
            {isResending ? 'Resending...' : 'Resend verification email'}
          </Button>

          <div className="flex flex-col gap-2 text-sm">
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </Link>
            <p className="text-gray-500">
              Already verified?{' '}
              <Link
                href="/auth/signin"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="pt-4 text-xs text-gray-500">
          <p>
            If you're having trouble, please contact support
          </p>
        </div>
      </div>
    </div>
  );
}