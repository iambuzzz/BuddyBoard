
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
import { useEffect, useState, useMemo, useCallback } from 'react';
import { doc, updateDoc, setDoc, getDoc, writeBatch, collection, query, where, getDocs, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useFirestore, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, ArrowLeft, Copy, Users, UserPlus, LogOut as LogOutIcon, Crown, Link as LinkIcon, Link2Off, Send, X, Check, MoreVertical, ShieldAlert, Trash2, UserCog, UserCheck, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Group, UserProfile, PairInvitation, GroupInvitation } from '@/lib/types';
import short from 'short-uuid';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

const groupInviteSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});
type GroupInviteValues = z.infer<typeof groupInviteSchema>;

const pairInviteSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});
type PairInviteValues = z.infer<typeof pairInviteSchema>;

type GroupConflictInfo = {
    invitation: PairInvitation;
    senderProfile: UserProfile;
};

const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
};


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
  
  const [sentPairInvites, setSentPairInvites] = useState<PairInvitation[]>([]);
  const [receivedPairInvites, setReceivedPairInvites] = useState<PairInvitation[]>([]);
  const [isPairingLoading, setIsPairingLoading] = useState(true);
  const [pairedPartner, setPairedPartner] = useState<UserProfile | null>(null);

  const [receivedGroupInvites, setReceivedGroupInvites] = useState<GroupInvitation[]>([]);

  const [groupConflict, setGroupConflict] = useState<GroupConflictInfo | null>(null);

  const [photoUrlInput, setPhotoUrlInput] = useState('');

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
  
  const inviteToGroupForm = useForm<GroupInviteValues>({
      resolver: zodResolver(groupInviteSchema),
      defaultValues: { email: '' }
  });

  const pairInviteForm = useForm<PairInviteValues>({
      resolver: zodResolver(pairInviteSchema),
      defaultValues: { email: '' }
  });

  const userRoleInGroup = useMemo(() => {
    if (!group || !user) return null;
    return group.members[user.uid];
  }, [group, user]);

  const canManageGroup = useMemo(() => {
    const role = userRoleInGroup;
    return role === 'admin' || role === 'co-admin';
  }, [userRoleInGroup]);


  // --- Data Fetching Effects ---

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        displayName: profile.displayName || '',
        cardTheme: profile.cardTheme || 'riya',
      });
      setPhotoUrlInput(profile.photoURL || '');
    }
  }, [profile, profileForm]);

  useEffect(() => {
    if (!profile || !firestore) return;

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

    if (profile?.pairedWith) {
        const partnerRef = doc(firestore, 'users', profile.pairedWith);
        getDoc(partnerRef).then(docSnap => {
            if (docSnap.exists()) setPairedPartner(docSnap.data() as UserProfile);
            else setPairedPartner(null);
        });
    } else {
        setPairedPartner(null);
    }

    const sentQuery = query(collection(firestore, 'pair_invitations'), where('senderId', '==', user.uid));
    const unsubSent = onSnapshot(sentQuery, (snapshot) => {
        const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PairInvitation));
        setSentPairInvites(invites.filter(inv => inv.status === 'pending'));
    });
    
    const receivedQuery = query(collection(firestore, 'pair_invitations'), where('receiverId', '==', user.uid));
    const unsubReceived = onSnapshot(receivedQuery, (snapshot) => {
        const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PairInvitation));
        setReceivedPairInvites(invites.filter(inv => inv.status === 'pending'));
    });

    setIsPairingLoading(false);
    return () => { unsubSent(); unsubReceived(); };
  }, [user, firestore, profile?.pairedWith]);

  useEffect(() => {
    if (!user || !firestore || profile?.groupId) {
        setReceivedGroupInvites([]);
        return;
    };
    const receivedGroupInvitesQuery = query(collection(firestore, 'group_invitations'), where('receiverEmail', '==', user.email), where('status', '==', 'pending'));
    const unsubReceivedGroup = onSnapshot(receivedGroupInvitesQuery, snapshot => {
        const invites = snapshot.docs.map(d => ({id: d.id, ...d.data() } as GroupInvitation));
        setReceivedGroupInvites(invites);
    });
    return () => unsubReceivedGroup();
  }, [user, firestore, profile?.groupId]);


  // --- Profile/Password Handler ---
  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user || !firestore || !auth?.currentUser) return;
    setIsSaving(true);
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

  async function handleSavePhotoUrl() {
    if (!user || !firestore || !auth?.currentUser) return;
    setIsSaving(true);
    try {
        const userProfileRef = doc(firestore, 'users', user.uid);
        await updateDoc(userProfileRef, { photoURL: photoUrlInput });
        await updateProfile(auth.currentUser, { photoURL: photoUrlInput });
        toast({ title: 'Profile Photo Updated!', description: 'Your new photo has been saved.' });
        refetch();
    } catch (error: any) {
        console.error("Error updating photo URL:", error);
        toast({ title: 'Error', description: 'Could not update your photo. Please try again.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
}
  
  // --- Group Handlers ---
  async function onCreateGroup(data: GroupCreateValues) {
    if (!user || !firestore || !profile) return;
    setIsSaving(true);

    try {
        const batch = writeBatch(firestore);
        const newGroupId = doc(collection(firestore, 'groups')).id;
        const newGroupRef = doc(firestore, 'groups', newGroupId);
        const userProfileRef = doc(firestore, 'users', user.uid);

        const newMembers: { [uid: string]: 'admin' | 'co-admin' | 'member' } = { [user.uid]: 'admin' };

        if (profile.pairedWith) {
            newMembers[profile.pairedWith] = 'member';
            const partnerProfileRef = doc(firestore, 'users', profile.pairedWith);
            batch.update(partnerProfileRef, { groupId: newGroupId });
        }

        const newGroup: Omit<Group, 'id'> = {
            name: data.groupName,
            invitationCode: short.generate(),
            createdBy: user.uid,
            members: newMembers,
        };

        batch.set(newGroupRef, newGroup);
        batch.update(userProfileRef, { groupId: newGroupId });

        await batch.commit();
        toast({ title: 'Group Created!', description: `Successfully created ${data.groupName}.` });
        createGroupForm.reset();
        refetch();
    } catch (error: any) {
        console.error("Error creating group:", error);
        toast({ title: 'Error', description: 'Could not create group.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  async function handleGroupInvitation(invitation: GroupInvitation, action: 'accept' | 'decline') {
    if (!user || !firestore) return;
    setIsSaving(true);
    const invRef = doc(firestore, 'group_invitations', invitation.id);

    try {
        if(action === 'accept') {
            const batch = writeBatch(firestore);
            batch.update(doc(firestore, 'users', user.uid), { groupId: invitation.groupId });
            batch.update(doc(firestore, 'groups', invitation.groupId), { [`members.${user.uid}`]: 'member' });
            batch.update(invRef, { status: 'accepted' });
            await batch.commit();
            toast({ title: 'Welcome!', description: `You have joined the group: ${invitation.groupName}`});
            refetch();
        } else { // decline
            await updateDoc(invRef, { status: 'declined' });
            toast({ title: 'Invitation Declined' });
        }
    } catch (e: any) {
        toast({ title: 'Error', description: `Failed to ${action} invitation.`, variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  async function onInviteToGroup(data: GroupInviteValues) {
    if (!user || !firestore || !profile || !group) return;
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
        } else {
            const receiver = querySnapshot.docs[0].data() as UserProfile;
            if (receiver.groupId === group.id) {
                toast({ title: "Already a member", description: `${receiver.displayName} is already in this group.`});
            } else {
                const newInvite: Omit<GroupInvitation, 'id'> = {
                    groupId: group.id,
                    groupName: group.name,
                    senderId: user.uid,
                    senderName: profile.displayName,
                    receiverEmail: receiver.email,
                    status: 'pending',
                    createdAt: Date.now(),
                };
                await addDoc(collection(firestore, 'group_invitations'), newInvite);
                toast({ title: "Invite Sent!", description: `Invitation sent to ${receiver.displayName}.` });
                inviteToGroupForm.reset();
            }
        }
    } catch(e: any) {
        toast({ title: "Error sending invite", description: e.message, variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  async function onLeaveGroup() {
    if (!user || !firestore || !group) return;
    setIsSaving(true);
    
    try {
        const batch = writeBatch(firestore);
        
        // Unpair user and partner if they exist
        batch.update(doc(firestore, 'users', user.uid), { groupId: null, pairedWith: null });
        if (profile?.pairedWith) {
             batch.update(doc(firestore, 'users', profile.pairedWith), { pairedWith: null });
        }

        const groupRef = doc(firestore, 'groups', group.id);
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
        
        await batch.commit();
        toast({ title: 'Group Left', description: 'You have successfully left the group.' });
        refetch();
    } catch (error: any) {
        toast({ title: 'Error', description: 'Failed to leave group.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  async function handleMemberAction(memberUid: string, action: 'make-admin' | 'make-co-admin' | 'make-member' | 'kick') {
    if (!user || !firestore || !group || user.uid === memberUid) return;

    const groupRef = doc(firestore, 'groups', group.id);
    setIsSaving(true);

    try {
        const batch = writeBatch(firestore);
        const groupDoc = await getDoc(groupRef);
        if (!groupDoc.exists()) throw new Error("Group not found.");
        
        const currentMembers = groupDoc.data().members;
        const memberProfileSnap = await getDoc(doc(firestore, 'users', memberUid));
        if (!memberProfileSnap.exists()) throw new Error("Member profile not found.");
        const memberProfile = memberProfileSnap.data() as UserProfile;

        if (action === 'kick') {
            delete currentMembers[memberUid];
            batch.update(groupRef, { members: currentMembers });
            
            const memberUserRef = doc(firestore, 'users', memberUid);
            batch.update(memberUserRef, { groupId: null, pairedWith: null });

            // If the kicked member was paired, unpair their partner too
            if (memberProfile.pairedWith) {
                const partnerRef = doc(firestore, 'users', memberProfile.pairedWith);
                batch.update(partnerRef, { pairedWith: null });
            }
        } else if (action === 'make-admin') {
            currentMembers[user.uid] = 'member'; // Demote current admin
            currentMembers[memberUid] = 'admin';
            batch.update(groupRef, { members: currentMembers });
        } else if (action === 'make-co-admin') {
            currentMembers[memberUid] = 'co-admin';
            batch.update(groupRef, { members: currentMembers });
        } else if (action === 'make-member') {
            currentMembers[memberUid] = 'member';
            batch.update(groupRef, { members: currentMembers });
        }

        await batch.commit();
        toast({ title: 'Success', description: 'Group member updated.' });
    } catch (error: any) {
        console.error("Error updating member role: ", error);
        toast({ title: 'Error', description: 'Could not update member.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
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
        
        if (receiver.pairedWith) {
            toast({ title: "User already paired", description: `${receiver.displayName} is already paired with someone else.`, variant: 'destructive'});
            setIsSaving(false);
            return;
        }

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
            id: doc(collection(firestore, 'pair_invitations')).id,
            senderId: user.uid,
            senderName: profile.displayName,
            receiverId: receiver.uid,
            receiverName: receiver.displayName,
            status: 'pending',
            createdAt: Date.now(),
        };
        await setDoc(doc(firestore, 'pair_invitations', newInvite.id), newInvite);
        toast({ title: "Invite Sent!", description: `Pairing invitation sent to ${receiver.displayName}.` });
        pairInviteForm.reset();
    } catch(e: any) {
        toast({ title: "Error sending invite", description: e.message, variant: 'destructive' });
    } finally { setIsSaving(false); }
  }

  const executePairing = useCallback(async (invitation: PairInvitation, resolution: 'leave' | 'join' | 'invite' | 'none' = 'none') => {
    if (!user || !firestore || !profile) return;
    setIsSaving(true);

    const batch = writeBatch(firestore);
    const invRef = doc(firestore, 'pair_invitations', invitation.id);
    const senderRef = doc(firestore, 'users', invitation.senderId);
    const receiverRef = doc(firestore, 'users', invitation.receiverId);
    
    try {
        const senderDoc = await getDoc(senderRef);
        const senderProfile = senderDoc.data() as UserProfile;
        const receiverProfile = profile; 

        const leaveCurrentGroup = async (userProfile: UserProfile, userId: string) => {
            if (userProfile.groupId) {
                const oldGroupRef = doc(firestore, 'groups', userProfile.groupId);
                const oldGroupDoc = await getDoc(oldGroupRef);
                if (oldGroupDoc.exists()) {
                    const oldGroupData = oldGroupDoc.data() as Group;
                    const newMembers = { ...oldGroupData.members };
                    delete newMembers[userId];
                    batch.update(oldGroupRef, { members: newMembers });
                }
            }
        };

        if (resolution === 'leave') {
            await leaveCurrentGroup(senderProfile, invitation.senderId);
            await leaveCurrentGroup(receiverProfile, invitation.receiverId);
            batch.update(senderRef, { groupId: null });
            batch.update(receiverRef, { groupId: null });

        } else if (resolution === 'join') { 
            if (senderProfile.groupId) {
                await leaveCurrentGroup(receiverProfile, invitation.receiverId);
                batch.update(receiverRef, { groupId: senderProfile.groupId });
                batch.update(doc(firestore, 'groups', senderProfile.groupId), { [`members.${invitation.receiverId}`]: 'member' });
            }
        } else if (resolution === 'invite') { 
            if (receiverProfile.groupId) {
                await leaveCurrentGroup(senderProfile, invitation.senderId);
                batch.update(senderRef, { groupId: receiverProfile.groupId });
                batch.update(doc(firestore, 'groups', receiverProfile.groupId), { [`members.${invitation.senderId}`]: 'member' });
            }
        }

        batch.update(invRef, { status: 'accepted' });
        batch.update(senderRef, { pairedWith: invitation.receiverId });
        batch.update(receiverRef, { pairedWith: invitation.senderId });

        await batch.commit();
        toast({ title: "Pairing successful!", description: `You are now paired with ${invitation.senderName}.` });
        refetch();

    } catch (e: any) {
        console.error("Error executing pairing:", e);
        toast({ title: 'Error', description: 'Could not complete pairing action.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
        setGroupConflict(null);
    }
}, [user, firestore, profile, refetch, toast]);


    async function handlePairInvitationAction(invitation: PairInvitation, action: 'accept' | 'decline' | 'cancel') {
        if (!user || !firestore || !profile) return;
        
        if (action === 'accept') {
            setIsSaving(true);
            const senderProfileSnap = await getDoc(doc(firestore, 'users', invitation.senderId));
            if (!senderProfileSnap.exists()) {
                toast({ title: 'Error', description: 'Could not find the sender\'s profile.', variant: 'destructive' });
                setIsSaving(false);
                return;
            }
            const senderProfile = senderProfileSnap.data() as UserProfile;

            if (profile.groupId !== senderProfile.groupId) {
                setGroupConflict({ invitation, senderProfile });
                setIsSaving(false); 
                return;
            }
            await executePairing(invitation, 'none');

        } else if (action === 'decline') {
            setIsSaving(true);
            const invRef = doc(firestore, 'pair_invitations', invitation.id);
            try { await updateDoc(invRef, { status: 'declined' }); toast({ title: "Invitation Declined" }); }
            catch (e) { toast({ title: 'Error', description: 'Could not decline invitation.', variant: 'destructive' }); }
            finally { setIsSaving(false); }
        } else if (action === 'cancel') {
            setIsSaving(true);
            const invRef = doc(firestore, 'pair_invitations', invitation.id);
            try { await deleteDoc(invRef); toast({ title: "Invitation Cancelled" }); }
            catch (e) { toast({ title: 'Error', description: 'Could not cancel invitation.', variant: 'destructive' }); }
            finally { setIsSaving(false); }
        }
    }

  async function onUnpair() {
    if (!user || !firestore || !profile?.pairedWith) return;
    setIsSaving(true);
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'users', user.uid), { pairedWith: null });
    batch.update(doc(firestore, 'users', profile.pairedWith), { pairedWith: null });
    try { 
        await batch.commit(); 
        toast({ title: 'Unpaired', description: 'You are no longer paired.' }); 
        refetch(); 
    } 
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
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={pairedPartner.photoURL} />
                            <AvatarFallback>{getInitials(pairedPartner.displayName)}</AvatarFallback>
                        </Avatar>
                        <p>You are currently paired with <span className="font-bold">{pairedPartner.displayName}</span>.</p>
                    </div>
                    <Button onClick={onUnpair} disabled={isSaving} className="w-full bg-[--riya-primary] hover:bg-violet-500">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
                        Unpair
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><LinkIcon /> Pairing Management</CardTitle>
                <CardDescription>
                  {profile?.groupId ? 'You are in a group. Pairing with users outside your group may affect your group membership.' : 'Send an invitation to another user to pair up.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Send /> Send a Pairing Invite</h3>
                    <Form {...pairInviteForm}>
                        <form onSubmit={pairInviteForm.handleSubmit(onSendPairInvite)} className="flex items-start gap-2">
                           <FormField control={pairInviteForm.control} name="email" render={({ field }) => (
                                <FormItem className="flex-grow"><FormControl><Input placeholder="User's email address" {...field} /></FormControl><FormMessage /></FormItem>
                           )} />
                           <Button type="submit" disabled={isSaving} className="bg-[--riya-primary] hover:bg-violet-500">{isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Invite'}</Button>
                        </form>
                    </Form>
                </div>
                <Separator />
                {receivedPairInvites.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Received Invitations</h3>
                        <div className="space-y-2">
                            {receivedPairInvites.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-slate-100 rounded-md">
                                    <p>From <span className="font-bold">{inv.senderName}</span></p>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-100" onClick={() => handlePairInvitationAction(inv, 'accept')}><Check className="h-4 w-4"/></Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-100" onClick={() => handlePairInvitationAction(inv, 'decline')}><X className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {sentPairInvites.length > 0 && (
                     <div>
                        <h3 className="font-semibold mb-2">Sent Invitations</h3>
                        <div className="space-y-2">
                            {sentPairInvites.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-slate-100 rounded-md">
                                    <p>To <span className="font-bold">{inv.receiverName}</span> (pending)</p>
                                    <Button size="sm" variant="outline" onClick={() => handlePairInvitationAction(inv, 'cancel')}>Cancel</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {receivedPairInvites.length === 0 && sentPairInvites.length === 0 && <p className="text-sm text-slate-500 text-center">No pending invitations.</p>}
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
           <CardContent className="space-y-6">
              {canManageGroup && (
                <div className="space-y-4">
                  <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2"><UserPlus/> Invite Members by Email</h3>
                      <Form {...inviteToGroupForm}>
                          <form onSubmit={inviteToGroupForm.handleSubmit(onInviteToGroup)} className="flex items-start gap-2">
                            <FormField control={inviteToGroupForm.control} name="email" render={({ field }) => (
                                  <FormItem className="flex-grow"><FormControl><Input placeholder="User's email to invite" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                            <Button type="submit" disabled={isSaving} className="bg-[--riya-primary] hover:bg-violet-500">{isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Send Invite'}</Button>
                          </form>
                      </Form>
                  </div>
                  <div className="space-y-2">
                    <Label>Or use Invitation Code</Label>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={group.invitationCode} className="bg-slate-100" />
                      <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(group.invitationCode); toast({title: "Copied!", description: "Invitation code copied to clipboard."}); }}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Separator/>
                </div>
              )}
             <div>
                <h3 className="font-semibold mb-2">Members ({groupMembers.length})</h3>
                <div className="mt-2 space-y-2 rounded-md border p-2">
                  {groupMembers.sort((a,b) => a.displayName.localeCompare(b.displayName)).map(member => (
                    <div key={member.uid} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={member.photoURL} alt={member.displayName} />
                            <AvatarFallback className="text-xs">{getInitials(member.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.displayName}</span>
                        {member.uid === user?.uid && <span className="text-xs text-emerald-600 font-bold">(You)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {group.members[member.uid] === 'admin' && (
                          <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><Crown className="h-3 w-3" /> ADMIN</span>
                        )}
                        {group.members[member.uid] === 'co-admin' && (
                          <span className="text-xs font-bold text-sky-600 flex items-center gap-1"><Star className="h-3 w-3" /> CO-ADMIN</span>
                        )}
                        {userRoleInGroup === 'admin' && user.uid !== member.uid && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Manage {member.displayName}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {group.members[member.uid] !== 'admin' && <DropdownMenuItem onClick={() => handleMemberAction(member.uid, 'make-admin')}><Crown className="mr-2"/> Make Admin</DropdownMenuItem>}
                                    {group.members[member.uid] === 'member' && <DropdownMenuItem onClick={() => handleMemberAction(member.uid, 'make-co-admin')}><Star className="mr-2"/> Make Co-Admin</DropdownMenuItem>}
                                    {group.members[member.uid] === 'co-admin' && <DropdownMenuItem onClick={() => handleMemberAction(member.uid, 'make-member')}><UserCog className="mr-2"/> Make Member</DropdownMenuItem>}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-500" onClick={() => handleMemberAction(member.uid, 'kick')}><Trash2 className="mr-2"/> Kick Member</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {userRoleInGroup === 'co-admin' && user.uid !== member.uid && group.members[member.uid] === 'member' && (
                            <Button size="sm" variant="outline" onClick={() => handleMemberAction(member.uid, 'make-co-admin')}><Star className="mr-2 h-3 w-3"/> Promote</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
             <Separator />
             <Button onClick={onLeaveGroup} disabled={isSaving} className="w-full bg-[--riya-primary] hover:bg-violet-500">
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
             <CardDescription>Create a new group or join one with an invite.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {receivedGroupInvites.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldAlert /> Pending Group Invitations</h3>
                    <div className="space-y-2">
                        {receivedGroupInvites.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-slate-100 rounded-md">
                                <p>From <span className="font-bold">{inv.senderName}</span> to join <span className="font-bold">{inv.groupName}</span></p>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-100" onClick={() => handleGroupInvitation(inv, 'accept')}><Check className="h-4 w-4"/></Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-100" onClick={() => handleGroupInvitation(inv, 'decline')}><X className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Crown /> Create a New Group</h3>
              <Form {...createGroupForm}>
                <form onSubmit={createGroupForm.handleSubmit(onCreateGroup)} className="flex items-start gap-2">
                   <FormField control={createGroupForm.control} name="groupName" render={({ field }) => (
                        <FormItem className="flex-grow"><FormControl><Input placeholder="My Awesome Group" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  <Button type="submit" disabled={isSaving} className="bg-[--riya-primary] hover:bg-violet-500">{isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Create'}</Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>
    )
  }

  const renderGroupConflictDialog = () => {
    if (!groupConflict) return null;
    const { invitation, senderProfile } = groupConflict;
    const senderIsInGroup = !!senderProfile.groupId;
    const receiverIsInGroup = !!profile?.groupId;

    return (
        <AlertDialog open={!!groupConflict} onOpenChange={() => setGroupConflict(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Group Conflict Detected</AlertDialogTitle>
                    <AlertDialogDescription>
                        You and {senderProfile.displayName} are in different groups. To pair up, you need to be in the same group. Please choose an option:
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch w-full">
                    {senderIsInGroup && (
                         <Button variant="outline" onClick={() => executePairing(invitation, 'join')}>
                            Join {senderProfile.displayName}'s Group &amp; Pair
                        </Button>
                    )}
                     {receiverIsInGroup && (
                        <Button className="bg-[--riya-primary] hover:bg-violet-500" onClick={() => executePairing(invitation, 'invite')}>
                            Invite {senderProfile.displayName} to My Group &amp; Pair
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => executePairing(invitation, 'leave')}>
                        Both Leave Current Groups &amp; Pair
                    </Button>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
  };


  return (
     <div className="min-h-screen w-full flex flex-col items-center bg-[#e3eeff] p-4 pb-12">
       <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
        </Button>

        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="pairing">Pairing</TabsTrigger>
                <TabsTrigger value="group">Group</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Settings</CardTitle>
                        <CardDescription>Manage your account and card appearance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="flex flex-col items-center space-y-4 mb-8">
                        <Avatar className="h-24 w-24 border">
                            <AvatarImage src={profile?.photoURL} />
                            <AvatarFallback className="text-3xl">{profile ? getInitials(profile.displayName) : ''}</AvatarFallback>
                        </Avatar>
                        
                        <div className="w-full space-y-2">
                            <Label htmlFor="photo-url">Profile Photo URL</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    id="photo-url"
                                    type="url"
                                    placeholder="https://example.com/image.png"
                                    value={photoUrlInput}
                                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                                    disabled={isSaving}
                                />
                                <Button onClick={handleSavePhotoUrl} disabled={isSaving} className="bg-[--riya-primary] hover:bg-violet-500">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Save'}
                                </Button>
                            </div>
                        </div>
                    </div>

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
                        <Button type="submit" disabled={isSaving} className="w-full bg-[--riya-primary] hover:bg-violet-500">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                        </Button>
                        </form>
                    </Form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="pairing">
                {renderPairingManagement()}
            </TabsContent>

            <TabsContent value="group">
                {renderGroupManagement()}
            </TabsContent>
        </Tabs>

        {renderGroupConflictDialog()}

       </div>
    </div>
  );
}
