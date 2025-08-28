'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="rounded-full bg-green-100 p-4 mx-auto w-fit">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold">Check je email</h2>
            <p className="mt-2 text-gray-600">
              We hebben een wachtwoord reset link gestuurd naar:
            </p>
            <p className="font-medium text-gray-900 mt-1">{email}</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Geen email ontvangen? Check je spam folder of probeer opnieuw.
            </p>
            
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                variant="outline"
                className="w-full"
              >
                Probeer een ander email adres
              </Button>
              
              <Link href="/auth/signin" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Terug naar inloggen
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">ROCQET</h1>
          <h2 className="mt-6 text-2xl font-semibold">Wachtwoord vergeten?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Geen probleem! Vul je email in en we sturen je een reset link.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email adres
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Versturen...' : 'Stuur reset link'}
            </Button>

            <Link href="/auth/signin" className="block">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar inloggen
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}