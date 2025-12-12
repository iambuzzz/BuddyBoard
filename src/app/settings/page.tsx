

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
import { doc, updateDoc, setDoc, getDoc, writeBatch, collection, query, where, getDocs, onSnapshot, DocumentData, QuerySnapshot, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useFirestore, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Copy, Users, UserPlus, LogOut as LogOutIcon, Crown, Link as LinkIcon, Link2Off, Send, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Group, UserProfile, PairInvitation } from '@/lib/types';
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

const pairInviteSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});
type PairInviteValues = z.infer<typeof pairInviteSchema>;


export default function SettingsPage() {
  const { user, profile, isLoading: isUserLoading, refetch } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);
  const [isGroupLoading, setIsGroupLoading] = useState(true);
  
  const [sentInvites, setSentInvites] = useState<PairInvitation[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<PairInvitation[]>([]);
  const [isPairingLoading, setIsPairingLoading] = useState(true);
  const [pairedPartner, setPairedPartner] = useState<UserProfile | null>(null);

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

  const pairInviteForm = useForm<PairInviteValues>({
      resolver: zodResolver(pairInviteSchema),
      defaultValues: { email: '' }
  });

  const userIsAdmin = useMemo(() => {
    if (!group || !user) return false;
    return group.members[user.uid] === 'admin';
  }, [group, user]);

  // --- Data Fetching Effects ---

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

    // Fetch Group Data
    if (profile.groupId) {
        setIsGroupLoading(true);
        const groupDocRef = doc(firestore, 'groups', profile.groupId);
        const unsubscribe = onSnapshot(groupDocRef, async (groupSnap) => {
            if (groupSnap.exists()) {
                const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
                setGroup(groupData);
                const memberUids = Object.keys(groupData.members);
                if (memberUids.length > 0) {
                    const usersQuery = query(collection(firestore, 'users'), where('uid', 'in', memberUids));
                    const usersSnap = await getDocs(usersQuery);
                    setGroupMembers(usersSnap.docs.map(d => d.data() as UserProfile));
                } else {
                    setGroupMembers([]);
                }
            } else { setGroup(null); setGroupMembers([]); }
            setIsGroupLoading(false);
        });
        return () => unsubscribe();
    } else {
        setGroup(null);
        setGroupMembers([]);
        setIsGroupLoading(false);
    }
  }, [profile, firestore]);
  
  useEffect(() => {
    if (!user || !firestore) return;
    setIsPairingLoading(true);

    // Fetch Partner Profile
    if (profile?.pairedWith) {
        const partnerRef = doc(firestore, 'users', profile.pairedWith);
        getDoc(partnerRef).then(docSnap => {
            if (docSnap.exists()) setPairedPartner(docSnap.data() as UserProfile);
            else setPairedPartner(null);
        });
    } else {
        setPairedPartner(null);
    }

    // Fetch Sent Invites
    const sentQuery = query(collection(firestore, 'pair_invitations'), where('senderId', '==', user.uid));
    const unsubSent = onSnapshot(sentQuery, (snapshot) => {
        const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PairInvitation));
        setSentInvites(invites.filter(inv => inv.status === 'pending'));
    });
    
    // Fetch Received Invites
    const receivedQuery = query(collection(firestore, 'pair_invitations'), where('receiverId', '==', user.uid));
    const unsubReceived = onSnapshot(receivedQuery, (snapshot) => {
        const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PairInvitation));
        setReceivedInvites(invites.filter(inv => inv.status === 'pending'));
    });

    setIsPairingLoading(false);
    return () => { unsubSent(); unsubReceived(); };
  }, [user, firestore, profile?.pairedWith]);


  // --- Profile/Password Handler ---
  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user || !firestore || !auth?.currentUser) return;
    setIsSaving(true);
    // ... (rest of the function is unchanged)
    try {
      const { displayName, cardTheme, newPassword, currentPassword } = data;
      const userProfileRef = doc(firestore, 'users', user.uid);
      
      await updateDoc(userProfileRef, { displayName, cardTheme });
      if(auth.currentUser.displayName !== displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }

      if (newPassword && currentPassword) {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
        toast({ title: 'Success!', description: 'Profile and password updated successfully.' });
        profileForm.reset({ ...profileForm.getValues(), currentPassword: '', newPassword: '' });
      } else {
        toast({ title: 'Settings Saved', description: 'Your profile has been updated successfully.' });
      }
      refetch();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/invalid-credential') {
        toast({ title: 'Incorrect Password', description: 'The current password you entered is incorrect.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message || 'Failed to update settings.', variant: 'destructive' });
      }
    } finally { setIsSaving(false); }
  }
  
  // --- Group Handlers ---
  async function onCreateGroup(data: GroupCreateValues) {
    if (!user || !firestore) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    const newGroupId = doc(collection(firestore, 'groups')).id;
    const newGroupRef = doc(firestore, 'groups', newGroupId);
    const userProfileRef = doc(firestore, 'users', user.uid);
    const newGroup: Omit<Group, 'id'> = { name: data.groupName, invitationCode: short.generate(), createdBy: user.uid, members: { [user.uid]: 'admin' } };
    batch.set(newGroupRef, newGroup);
    batch.update(userProfileRef, { groupId: newGroupId });
    try { await batch.commit(); toast({ title: 'Group Created!', description: `Successfully created ${data.groupName}.`}); refetch(); } 
    catch (error: any) { toast({ title: 'Error', description: 'Could not create group.', variant: 'destructive' }); } 
    finally { setIsSaving(false); }
  }

  async function onJoinGroup(data: GroupJoinValues) {
    if (!user || !firestore) return;
    setIsSaving(true);
    try {
      const q = query(collection(firestore, 'groups'), where('invitationCode', '==', data.invitationCode));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) { toast({ title: 'Invalid Code', description: 'No group found with that invitation code.', variant: 'destructive' }); setIsSaving(false); return; }
      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data() as Group;
      if (groupData.members[user.uid]) { toast({ title: 'Already a Member', description: 'You are already a member of this group.' }); setIsSaving(false); return; }
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, 'groups', groupDoc.id), { [`members.${user.uid}`]: 'member' });
      batch.update(doc(firestore, 'users', user.uid), { groupId: groupDoc.id });
      await batch.commit();
      toast({ title: 'Joined Group!', description: `You have successfully joined ${groupData.name}.` });
      refetch();
    } catch (error: any) {
      toast({ title: 'Error Joining Group', description: error.message || 'Failed to join group.', variant: 'destructive' });
    } finally { setIsSaving(false); }
  }

  async function onLeaveGroup() {
    if (!user || !firestore || !group) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'users', user.uid), { groupId: null, pairedWith: null });
    if(profile?.pairedWith) { batch.update(doc(firestore, 'users', profile.pairedWith), { pairedWith: null }); }
    const groupRef = doc(firestore, 'groups', group.id);
    const newMembers = { ...group.members };
    delete newMembers[user.uid];
    if (Object.keys(newMembers).length === 0) { batch.delete(groupRef); } 
    else {
      if (group.members[user.uid] === 'admin' && !Object.values(newMembers).includes('admin')) {
         const nextAdminUid = Object.keys(newMembers)[0];
         newMembers[nextAdminUid] = 'admin';
      }
      batch.update(groupRef, { members: newMembers });
    }
    try { await batch.commit(); toast({ title: 'Group Left', description: 'You have successfully left the group.' }); refetch(); } 
    catch (error: any) { toast({ title: 'Error', description: 'Failed to leave group.', variant: 'destructive' }); } 
    finally { setIsSaving(false); }
  }

  // --- Pairing Handlers ---
  
  async function onSendPairInvite(data: PairInviteValues) {
    if (!user || !firestore || !profile) return;
    setIsSaving(true);
    try {
        if (data.email.toLowerCase() === user.email?.toLowerCase()) {
            toast({ title: "Cannot invite yourself", variant: 'destructive'});
            setIsSaving(false);
            return;
        }
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where("email", "==", data.email.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ title: "User not found", description: `No user with email ${data.email} found.`, variant: 'destructive' });
            setIsSaving(false);
            return;
        }
        const receiver = querySnapshot.docs[0].data() as UserProfile;
        
        // Check if receiver is already paired
        if (receiver.pairedWith) {
            toast({ title: "User already paired", description: `${receiver.displayName} is already paired with someone else.`, variant: 'destructive'});
            setIsSaving(false);
            return;
        }

        // Check for existing pending invitation
        const existingInviteQuery = query(collection(firestore, 'pair_invitations'), 
            where('senderId', '==', user.uid), 
            where('receiverId', '==', receiver.uid),
            where('status', '==', 'pending'));
        const existingInviteSnap = await getDocs(existingInviteQuery);
        if (!existingInviteSnap.empty) {
            toast({ title: "Invite already sent", description: `You have already sent a pending invite to ${receiver.displayName}.`});
            setIsSaving(false);
            return;
        }

        const newInvite: Omit<PairInvitation, 'id'> = {
            senderId: user.uid,
            senderName: profile.displayName,
            receiverId: receiver.uid,
            receiverName: receiver.displayName,
            status: 'pending',
            createdAt: Date.now(),
        };
        await addDoc(collection(firestore, 'pair_invitations'), newInvite);
        toast({ title: "Invite Sent!", description: `Pairing invitation sent to ${receiver.displayName}.` });
        pairInviteForm.reset();
    } catch(e: any) {
        toast({ title: "Error sending invite", description: e.message, variant: 'destructive' });
    } finally { setIsSaving(false); }
  }

  async function handleInvitationAction(invitation: PairInvitation, action: 'accept' | 'decline' | 'cancel') {
    if (!user || !firestore) return;
    setIsSaving(true);

    const invRef = doc(firestore, 'pair_invitations', invitation.id);

    if (action === 'accept') {
        const batch = writeBatch(firestore);
        batch.update(invRef, { status: 'accepted' });
        batch.update(doc(firestore, 'users', invitation.senderId), { pairedWith: invitation.receiverId });
        batch.update(doc(firestore, 'users', invitation.receiverId), { pairedWith: invitation.senderId });
        try { await batch.commit(); toast({ title: "Pairing successful!", description: `You are now paired with ${invitation.senderName}.` }); refetch(); } 
        catch (e) { console.error(e); toast({ title: 'Error', description: 'Could not accept invitation.', variant: 'destructive' }); }
    } else if (action === 'decline') {
        try { await updateDoc(invRef, { status: 'declined' }); toast({ title: "Invitation Declined" }); }
        catch (e) { toast({ title: 'Error', description: 'Could not decline invitation.', variant: 'destructive' }); }
    } else if (action === 'cancel') {
        try { await deleteDoc(invRef); toast({ title: "Invitation Cancelled" }); }
        catch (e) { toast({ title: 'Error', description: 'Could not cancel invitation.', variant: 'destructive' }); }
    }
    setIsSaving(false);
  }

  async function onUnpair() {
    if (!user || !firestore || !profile?.pairedWith) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'users', user.uid), { pairedWith: null });
    batch.update(doc(firestore, 'users', profile.pairedWith), { pairedWith: null });
    try { await batch.commit(); toast({ title: 'Unpaired', description: 'You are no longer paired.' }); refetch(); } 
    catch (e) { toast({ title: 'Error', description: 'Could not unpair.', variant: 'destructive' }); }
    finally { setIsSaving(false); }
  }

  // --- Render Functions ---
  
  if (isUserLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#e3eeff]"><Loader2 className="h-12 w-12 animate-spin text-slate-500" /></div>;
  }

  const renderPairingManagement = () => {
    if (isPairingLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
    }

    if (profile?.pairedWith && pairedPartner) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LinkIcon /> Pairing Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>You are currently paired with <span className="font-bold">{pairedPartner.displayName}</span>.</p>
                    <Button variant="destructive" onClick={onUnpair} disabled={isSaving} className="w-full">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
                        Unpair
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    // Not paired, show invite UI
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><LinkIcon /> Pairing Management</CardTitle>
                <CardDescription>
                  {profile?.groupId ? 'You are in a group, so pairing is managed within the group view.' : 'Send an invitation to another user to pair up.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Send Invite Form */}
                <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Send /> Send a Pairing Invite</h3>
                    <Form {...pairInviteForm}>
                        <form onSubmit={pairInviteForm.handleSubmit(onSendPairInvite)} className="flex items-start gap-2">
                           <FormField control={pairInviteForm.control} name="email" render={({ field }) => (
                                <FormItem className="flex-grow"><FormControl><Input placeholder="User's email address" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Invite'}</Button>
                        </form>
                    </Form>
                </div>
                <Separator />
                {/* Received Invites */}
                {receivedInvites.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Received Invitations</h3>
                        <div className="space-y-2">
                            {receivedInvites.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-slate-100 rounded-md">
                                    <p>From <span className="font-bold">{inv.senderName}</span></p>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-100" onClick={() => handleInvitationAction(inv, 'accept')}><Check className="h-4 w-4"/></Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-100" onClick={() => handleInvitationAction(inv, 'decline')}><X className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Sent Invites */}
                {sentInvites.length > 0 && (
                     <div>
                        <h3 className="font-semibold mb-2">Sent Invitations</h3>
                        <div className="space-y-2">
                            {sentInvites.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-slate-100 rounded-md">
                                    <p>To <span className="font-bold">{inv.receiverName}</span> (pending)</p>
                                    <Button size="sm" variant="outline" className="h-7" onClick={() => handleInvitationAction(inv, 'cancel')}>Cancel</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {receivedInvites.length === 0 && sentInvites.length === 0 && <p className="text-sm text-slate-500 text-center">No pending invitations.</p>}
            </CardContent>
        </Card>
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
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(group.invitationCode); toast({title: "Copied!", description: "Invitation code copied to clipboard."}); }}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this code to invite others to your group.</p>
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
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOutIcon className="mr-2 h-4 w-4" />}
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
                   <FormField control={joinGroupForm.control} name="invitationCode" render={({ field }) => (
                        <FormItem className="flex-grow"><FormControl><Input placeholder="Invitation Code" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Join'}</Button>
                </form>
              </Form>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Crown /> Create a New Group</h3>
              <Form {...createGroupForm}>
                <form onSubmit={createGroupForm.handleSubmit(onCreateGroup)} className="flex items-start gap-2">
                   <FormField control={createGroupForm.control} name="groupName" render={({ field }) => (
                        <FormItem className="flex-grow"><FormControl><Input placeholder="My Awesome Group" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Create'}</Button>
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
                  <FormField control={profileForm.control} name="displayName" render={({ field }) => (
                      <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} /></FormControl><FormDescription>This name will be displayed on your task card.</FormDescription><FormMessage /></FormItem>
                  )} />
                  <FormField control={profileForm.control} name="cardTheme" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>Card Theme</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                          <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="riya" /></FormControl><FormLabel className="font-normal">Periwinkle (Riya's Theme)</FormLabel></FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="naitik" /></FormControl><FormLabel className="font-normal">Cyan (Naitik's Theme)</FormLabel></FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="ambuj" /></FormControl><FormLabel className="font-normal">Emerald (Ambuj's Theme)</FormLabel></FormItem>
                        </RadioGroup>
                      </FormControl><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="currentPassword" render={({ field }) => (
                      <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" placeholder="Enter current password" {...field} /></FormControl><FormDescription>Required only if you want to change your password.</FormDescription><FormMessage /></FormItem>
                  )} />
                  <FormField control={profileForm.control} name="newPassword" render={({ field }) => (
                      <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="Enter new password" {...field} /></FormControl><FormDescription>Leave this blank if you do not want to change your password.</FormDescription><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        {renderPairingManagement()}

        {renderGroupManagement()}

       </div>
    </div>
  );
}

    