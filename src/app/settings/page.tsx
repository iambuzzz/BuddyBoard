
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
import { useEffect, useState, useMemo } from 'react';
import { doc, updateDoc, setDoc, getDoc, writeBatch, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useFirestore, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Copy, Users, UserPlus, LogOut as LogOutIcon, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Group, UserProfile } from '@/lib/types';
import short from 'short-uuid';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

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
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Current password is required to set a new password.',
  path: ['currentPassword'],
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;

const groupCreateSchema = z.object({
  groupName: z.string().min(3, 'Group name must be at least 3 characters.').max(50, 'Group name too long.'),
});
type GroupCreateValues = z.infer<typeof groupCreateSchema>;

const groupJoinSchema = z.object({
  invitationCode: z.string().min(6, 'Invalid invitation code.'),
});
type GroupJoinValues = z.infer<typeof groupJoinSchema>;


export default function SettingsPage() {
  const { user, profile, isLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);
  const [isGroupLoading, setIsGroupLoading] = useState(true);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      cardTheme: 'riya',
      newPassword: '',
      currentPassword: '',
    },
    mode: 'onChange',
  });
  
  const createGroupForm = useForm<GroupCreateValues>({
    resolver: zodResolver(groupCreateSchema),
    defaultValues: { groupName: '' }
  });
  
  const joinGroupForm = useForm<GroupJoinValues>({
    resolver: zodResolver(groupJoinSchema),
    defaultValues: { invitationCode: '' }
  });

  const userIsAdmin = useMemo(() => {
    if (!group || !user) return false;
    return group.members[user.uid] === 'admin';
  }, [group, user]);

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        displayName: profile.displayName || '',
        cardTheme: profile.cardTheme || 'riya',
      });
    }
  }, [profile, profileForm]);

  useEffect(() => {
    if (!profile || !firestore) return;

    const fetchGroupData = async (groupId: string) => {
        setIsGroupLoading(true);
        const groupDocRef = doc(firestore, 'groups', groupId);
        const unsubscribe = onSnapshot(groupDocRef, async (groupSnap) => {
            if (groupSnap.exists()) {
                const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
                setGroup(groupData);
                
                const memberUids = Object.keys(groupData.members);
                if (memberUids.length > 0) {
                    const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberUids));
                    const usersSnap = await getDocs(usersQuery);
                    const membersData = usersSnap.docs.map(d => d.data() as UserProfile);
                    setGroupMembers(membersData);
                } else {
                    setGroupMembers([]);
                }
            } else {
                setGroup(null);
                setGroupMembers([]);
            }
            setIsGroupLoading(false);
        });
        return unsubscribe;
    };

    if (profile.groupId) {
        const unsubscribePromise = fetchGroupData(profile.groupId);
        return () => {
            unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
        };
    } else {
        setGroup(null);
        setGroupMembers([]);
        setIsGroupLoading(false);
    }
  }, [profile, firestore]);

  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user || !firestore || !auth?.currentUser) {
      toast({ title: 'Error', description: 'You must be logged in to save settings.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { displayName, cardTheme, newPassword, currentPassword } = data;
      const userProfileRef = doc(firestore, 'users', user.uid);
      
      await updateDoc(userProfileRef, { displayName, cardTheme });
      await updateProfile(auth.currentUser, { displayName });

      if (newPassword && currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        toast({ title: 'Success!', description: 'Profile and password updated successfully.' });
      } else {
        toast({ title: 'Settings Saved', description: 'Your profile has been updated successfully.' });
      }

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: error.message || 'Failed to update settings.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  async function onCreateGroup(data: GroupCreateValues) {
    if (!user || !firestore) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    
    const newGroupId = doc(collection(firestore, 'groups')).id;
    const newGroupRef = doc(firestore, 'groups', newGroupId);
    const userProfileRef = doc(firestore, 'users', user.uid);

    const newGroup: Group = {
      id: newGroupId,
      name: data.groupName,
      invitationCode: short.generate(),
      createdBy: user.uid,
      members: { [user.uid]: 'admin' }
    };
    
    batch.set(newGroupRef, newGroup);
    batch.update(userProfileRef, { groupId: newGroupId });
    
    try {
      await batch.commit();
      toast({ title: 'Group Created!', description: `Successfully created ${data.groupName}.`});
    } catch (error: any) {
      toast({ title: 'Error', description: 'Could not create group.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  async function onJoinGroup(data: GroupJoinValues) {
    if (!user || !firestore) return;
    setIsSaving(true);

    const q = query(collection(firestore, 'groups'), where('invitationCode', '==', data.invitationCode));
    
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast({ title: 'Invalid Code', description: 'No group found with that invitation code.', variant: 'destructive' });
        setIsSaving(false);
        return;
      }
      
      const groupDoc = querySnapshot.docs[0];
      const groupId = groupDoc.id;
      const groupRef = doc(firestore, 'groups', groupId);
      const userProfileRef = doc(firestore, 'users', user.uid);
      
      const batch = writeBatch(firestore);
      batch.update(groupRef, { [`members.${user.uid}`]: 'member' });
      batch.update(userProfileRef, { groupId: groupId });
      await batch.commit();
      
      toast({ title: 'Joined Group!', description: `You have successfully joined ${groupDoc.data().name}.` });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to join group.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  async function onLeaveGroup() {
    if (!user || !firestore || !group) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);

    const groupRef = doc(firestore, 'groups', group.id);
    const userProfileRef = doc(firestore, 'users', user.uid);

    batch.update(userProfileRef, { groupId: null });

    const newMembers = { ...group.members };
    delete newMembers[user.uid];

    if (Object.keys(newMembers).length === 0) {
      batch.delete(groupRef);
    } else {
      if (group.members[user.uid] === 'admin' && !Object.values(newMembers).includes('admin')) {
         const nextAdminUid = Object.keys(newMembers)[0];
         newMembers[nextAdminUid] = 'admin';
      }
      batch.update(groupRef, { members: newMembers });
    }
    
    try {
      await batch.commit();
      toast({ title: 'Group Left', description: 'You have successfully left the group.' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to leave group.', variant: 'destructive' });
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

  const renderGroupManagement = () => {
    if (isGroupLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
    }
    
    if (group) {
      return (
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><Users /> Group Details</CardTitle>
             <CardDescription>You are a member of <strong>{group.name}</strong>.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
              {userIsAdmin && (
                <div className="space-y-2">
                  <Label>Invitation Code</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={group.invitationCode} className="bg-slate-100" />
                    <Button variant="outline" size="icon" onClick={() => {
                        navigator.clipboard.writeText(group.invitationCode);
                        toast({title: "Copied!", description: "Invitation code copied to clipboard."});
                    }}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this code with others to invite them to your group.</p>
                </div>
              )}
             <div>
                <Label>Members ({groupMembers.length})</Label>
                <div className="mt-2 space-y-2 rounded-md border p-2">
                  {groupMembers.map(member => (
                    <div key={member.uid} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{member.displayName}</span>
                      {group.members[member.uid] === 'admin' && (
                        <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><Crown className="h-3 w-3" /> ADMIN</span>
                      )}
                    </div>
                  ))}
                </div>
             </div>
             <Separator />
             <Button variant="destructive" onClick={onLeaveGroup} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOutIcon />}
                Leave Group
             </Button>
           </CardContent>
         </Card>
      )
    }

    return (
       <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2"><Users /> Group Management</CardTitle>
             <CardDescription>Create a new group or join an existing one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2"><UserPlus /> Join a Group</h3>
              <Form {...joinGroupForm}>
                <form onSubmit={joinGroupForm.handleSubmit(onJoinGroup)} className="flex items-start gap-2">
                   <FormField
                      control={joinGroupForm.control}
                      name="invitationCode"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input placeholder="Invitation Code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Join'}
                  </Button>
                </form>
              </Form>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Crown /> Create a New Group</h3>
              <Form {...createGroupForm}>
                <form onSubmit={createGroupForm.handleSubmit(onCreateGroup)} className="flex items-start gap-2">
                   <FormField
                      control={createGroupForm.control}
                      name="groupName"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input placeholder="My Awesome Group" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Create'}
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>
    )
  }

  return (
     <div className="min-h-screen w-full flex flex-col items-center bg-[#e3eeff] p-4 pb-12">
       <div className="w-full max-w-md space-y-8">
        <div>
          <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your account and card appearance.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                  <FormField
                    control={profileForm.control}
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
                    control={profileForm.control}
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
                      control={profileForm.control}
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
                      control={profileForm.control}
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
        
        {renderGroupManagement()}

       </div>
    </div>
  );
}

    