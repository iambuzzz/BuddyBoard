"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Helper to create an empty task list for a new user
  const createInitialTaskList = async (userId: string) => {
    if (!firestore) return;
    const taskListRef = doc(firestore, 'task_lists', userId);
    await setDoc(taskListRef, {
      tasks: [],
      previousTasks: [],
      isLocked: false,
      isFinished: false,
      totalCompleted: 0,
      totalAssigned: 0,
      currentStreak: 0,
      maxStreak: 0,
      lockedAt: null,
      lastLockedAt: null,
      pairedWith: null,
    });
  };

  // Helper to create a user profile
  const createUserProfile = async (userId: string, email: string, displayName: string) => {
    if (!firestore) return;
    const userProfileRef = doc(firestore, 'users', userId);
    await setDoc(userProfileRef, {
      uid: userId,
      email: email,
      displayName: displayName,
      photoURL: null,
      cardTheme: 'riya', // Default theme set to 'riya'
    });
  };

  const handleAuthAction = async (isSignUp: boolean) => {
    if (!auth || !firestore) {
      toast({
        title: 'Error',
        description: 'Firebase not initialized. Please try again later.',
        variant: 'destructive',
      });
      return;
    }
    
    if (isSignUp && (!displayName || !email || !password)) {
      toast({
        title: 'Error',
        description: 'Please fill out all fields to sign up.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // --- New User Signup ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update auth profile
        await updateProfile(user, { displayName });

        // Create user profile and initial task list in parallel
        await Promise.all([
          createUserProfile(user.uid, user.email!, displayName),
          createInitialTaskList(user.uid)
        ]);

        toast({ title: 'Success', description: 'Account created successfully! Welcome.' });
      } else {
        // --- Existing User Login ---
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Success', description: 'Logged in successfully!' });
      }
      router.push('/');
    } catch (error: any) => {
      let description = error.message || 'An unknown error occurred.';
      if (error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please try again.';
      }
      
      toast({
        title: 'Authentication Error',
        description: description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff] p-4 relative">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Enter your credentials to access your task list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleAuthAction(false)} disabled={loading} className="w-full">
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Create an Account</CardTitle>
              <CardDescription>Start your productivity journey with a new account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="signup-name">Your Name</Label>
                <Input id="signup-name" type="text" placeholder="John Doe" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleAuthAction(true)} disabled={loading} className="w-full">
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
