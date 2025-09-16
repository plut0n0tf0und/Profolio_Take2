
'use client';

import { useState, useTransition } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

import { suggestPassword } from '@/ai/flows/ai-password-suggestion';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Wand2 } from 'lucide-react';

interface PasswordStrengthInputProps {
  field: ControllerRenderProps<any, string>;
}

export function PasswordStrengthInput({ field }: PasswordStrengthInputProps) {
  const { setValue, trigger } = useFormContext();
  const [isPending, startTransition] = useTransition();
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState('');
  const { toast } = useToast();

  const handleSuggestPassword = () => {
    setFeedback('');
    setStrength(0);
    startTransition(async () => {
      try {
        const result = await suggestPassword({
          length: 16,
          useSymbols: true,
          useNumbers: true,
        });
        if (result && result.password) {
          setValue(field.name, result.password, {
            shouldValidate: true,
            shouldDirty: true,
          });
          trigger(field.name);
          setStrength(result.strength);
          setFeedback(result.feedback);
        }
      } catch (error) {
        console.error('Failed to suggest password:', error);
        toast({
          title: 'Error',
          description: 'Could not suggest a password. Please try again.',
          className: 'px-3 py-2 text-sm border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-lg shadow-md',
        });
      }
    });
  };

  const getStrengthTextColor = () => {
    if (strength === 0) return '';
    if (strength < 40) return 'text-destructive';
    if (strength < 75) return 'text-primary';
    return 'text-green-400';
  };

  return (
    <FormItem>
      <div className="flex items-center justify-between">
        <FormLabel>Password</FormLabel>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={handleSuggestPassword}
          disabled={isPending}
          className="h-8 p-0 text-accent hover:underline-offset-4"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Suggest
        </Button>
      </div>
      <FormControl>
        <Input type="password" placeholder="••••••••" {...field} />
      </FormControl>
      {feedback && (
        <div className="mt-2 space-y-2">
          <Progress value={strength} className="h-2" />
          <p className={cn('text-sm font-medium', getStrengthTextColor())}>
            {feedback}
          </p>
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
}
