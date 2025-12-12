
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useFirestore, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(2, {
      message: 'Name must be at least 2 characters.',
    })
    .max(30, {
      message: 'Name must not be longer than 30 characters.',
    }),
  cardTheme: z.enum(['riya', 'naitik', 'ambuj'], {
    required_error: 'You need to select a theme.',
  }),
  newPassword: z.string().optional(),
  currentPassword: z.string().optional(),
}).refine(data => {
  // If newPassword is provided, currentPassword must also be provided.
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Current password is required to set a new password.',
  path: ['currentPassword'],
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SettingsPage() {
  const { user, profile, isLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      cardTheme: 'riya',
      newPassword: '',
      currentPassword: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || '',
        cardTheme: profile.cardTheme || 'riya',
      });
    }
  }, [profile, form]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user || !firestore || !auth?.currentUser) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save settings.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { displayName, cardTheme, newPassword, currentPassword } = data;
      const userProfileRef = doc(firestore, 'users', user.uid);
      
      // Update Firestore
      await updateDoc(userProfileRef, { displayName, cardTheme });

      // Update Auth profile display name
      await updateProfile(auth.currentUser, { displayName });

      // Update password if provided
      if (newPassword && currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        toast({
            title: 'Success!',
            description: 'Profile and password updated successfully.',
        });
      } else {
        toast({
            title: 'Settings Saved',
            description: 'Your profile has been updated successfully.',
        });
      }

      router.push('/');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }
  
  if (isUserLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff]">
        <Loader2 className="h-12 w-12 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
     <div className="min-h-screen w-full flex flex-col items-center bg-[#e3eeff] p-4 relative">
       <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
        </Button>
        <Card>
           <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your account and card appearance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This name will be displayed on your task card.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cardTheme"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Card Theme</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="riya" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Periwinkle (Riya's Theme)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="naitik" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Cyan (Naitik's Theme)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="ambuj" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Emerald (Ambuj's Theme)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="Enter current password" {...field} />
                        </FormControl>
                        <FormDescription>
                            Required only if you want to change your password.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormDescription>
                            Leave this blank if you do not want to change your password.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </Form>
           </CardContent>
        </Card>
       </div>
    </div>
  );
}
