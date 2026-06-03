

'use client';

import { useTheme } from '@/components/theme-provider';

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
import { doc, updateDoc, setDoc, getDoc, writeBatch, collection, query, where, getDocs, onSnapshot, addDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { useFirestore, useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowLeft, Copy, Users, UserPlus, LogOut as LogOutIcon, Crown, Link as LinkIcon, Link2Off, Send, X, Check, MoreVertical, ShieldAlert, Trash2, UserCog, UserCheck, Star, KeyRound } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const profileFormSchema = z.object({
    displayName: z
        .string()
        .min(2, {
            message: 'Name must be at least 2 characters.',
        })
        .max(30, {
            message: 'Name must not be longer than 30 characters.',
        }),
    cardTheme: z.enum(['periwinkle', 'cyan', 'emerald'], {
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

const groupInviteSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});
type GroupInviteValues = z.infer<typeof groupInviteSchema>;

const pairInviteSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});
type PairInviteValues = z.infer<typeof pairInviteSchema>;

type KickPairConfirmationInfo = {
    member: UserProfile;
    partner: UserProfile;
};

type ConfirmationInfo = {
    title: string;
    description: string;
    onConfirm: () => void;
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

    const [photoUrlInput, setPhotoUrlInput] = useState('');

    const [confirmation, setConfirmation] = useState<ConfirmationInfo | null>(null);
    const [kickPairConfirmation, setKickPairConfirmation] = useState<KickPairConfirmationInfo | null>(null);

    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            displayName: '',
            cardTheme: 'periwinkle',
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
                cardTheme: profile.cardTheme || 'periwinkle',
                newPassword: '',
                currentPassword: '',
            });
            setPhotoUrlInput(profile.photoURL || '');
        }
    }, [profile, profileForm]);

    useEffect(() => {
        if (!profile || !firestore) return;

        // This effect now correctly refetches group data when the profile (and its groupId) changes.
        let unsubscribe: (() => void) | undefined;
        if (profile.groupId) {
            setIsGroupLoading(true);
            const groupDocRef = doc(firestore, 'groups', profile.groupId);
            unsubscribe = onSnapshot(groupDocRef, async (groupSnap) => {
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
        } else {
            setGroup(null);
            setGroupMembers([]);
            setIsGroupLoading(false);
        }
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
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

        const sentQuery = query(collection(firestore, 'pair_invitations'), where('senderId', '==', user.uid), where('status', '==', 'pending'));
        const unsubSent = onSnapshot(sentQuery, (snapshot) => {
            const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PairInvitation));
            setSentPairInvites(invites);
        });

        const receivedQuery = query(collection(firestore, 'pair_invitations'), where('receiverId', '==', user.uid), where('status', '==', 'pending'));
        const unsubReceived = onSnapshot(receivedQuery, (snapshot) => {
            const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PairInvitation));
            setReceivedPairInvites(invites);
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
            const invites = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GroupInvitation));
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
            if (auth.currentUser.displayName !== displayName) {
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

            const newGroup: Omit<Group, 'id' | 'lastKickedUid'> = {
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

    async function onJoinGroup(data: GroupJoinValues) {
        if (!user || !firestore) return;
        setIsSaving(true);
        try {
            const groupsQuery = query(collection(firestore, 'groups'), where("invitationCode", "==", data.invitationCode));
            const groupSnapshot = await getDocs(groupsQuery);

            if (groupSnapshot.empty) {
                toast({ title: "Invalid Code", description: "No group found with that invitation code.", variant: "destructive" });
                setIsSaving(false);
                return;
            }

            const groupDoc = groupSnapshot.docs[0];
            const groupRef = doc(firestore, 'groups', groupDoc.id);
            const userRef = doc(firestore, 'users', user.uid);

            const batch = writeBatch(firestore);
            batch.update(groupRef, { [`members.${user.uid}`]: 'member' });
            batch.update(userRef, { groupId: groupDoc.id });
            await batch.commit();

            toast({ title: 'Joined Group!', description: `You are now a member of ${groupDoc.data().name}.` });
            joinGroupForm.reset();
            refetch(); // Refetch user data to update the UI with the new group info

        } catch (error: any) {
            console.error("Error joining group:", error);
            toast({ title: "Error", description: "Could not join the group. Please try again.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }

    async function handleGroupInvitation(invitation: GroupInvitation, action: 'accept' | 'decline') {
        if (!user || !firestore) return;
        setIsSaving(true);
        const invRef = doc(firestore, 'group_invitations', invitation.id);

        try {
            if (action === 'accept') {
                await runTransaction(firestore, async (transaction) => {
                    const groupRef = doc(firestore, 'groups', invitation.groupId);
                    const userRef = doc(firestore, 'users', user.uid);

                    const groupDoc = await transaction.get(groupRef);
                    if (!groupDoc.exists()) throw new Error("Group no longer exists.");

                    const groupData = groupDoc.data() as Group;
                    const updatedMembers = { ...groupData.members, [user.uid]: 'member' as const };

                    transaction.update(groupRef, { members: updatedMembers });
                    transaction.update(userRef, { groupId: invitation.groupId });
                    transaction.update(invRef, { status: 'accepted' });
                });

                toast({ title: 'Welcome!', description: `You have joined the group: ${invitation.groupName}` });
                refetch();
            } else { // decline
                await updateDoc(invRef, { status: 'declined' });
                toast({ title: 'Invitation Declined' });
            }
        } catch (e: any) {
            console.error("Error handling invitation:", e);
            toast({ title: 'Error', description: `Failed to ${action} invitation. Please try again.`, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }

    async function onInviteToGroup(data: GroupInviteValues) {
        if (!user || !firestore || !profile || !group) return;
        setIsSaving(true);
        try {
            if (data.email.toLowerCase() === user.email?.toLowerCase()) {
                toast({ title: "Cannot invite yourself", variant: 'destructive' });
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
                    toast({ title: "Already a member", description: `${receiver.displayName} is already in this group.` });
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
        } catch (e: any) {
            toast({ title: "Error sending invite", description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }

    const confirmLeaveGroup = () => {
        setConfirmation({
            title: "Are you sure you want to leave?",
            description: "You will need a new invitation to rejoin this group. If you are the last admin, another member will be promoted.",
            onConfirm: handleLeaveGroup
        });
    };

    async function handleLeaveGroup() {
        if (!user || !firestore || !group || !profile) return;
        setIsSaving(true);

        try {
            await runTransaction(firestore, async (transaction) => {
                const groupRef = doc(firestore, 'groups', group.id);
                const userProfileRef = doc(firestore, 'users', user.uid);

                const groupDoc = await transaction.get(groupRef);
                if (!groupDoc.exists()) {
                    // Group might have been deleted by another user, just update user profile
                    transaction.update(userProfileRef, { groupId: null, pairedWith: null });
                    if (profile.pairedWith) {
                        const partnerRef = doc(firestore, 'users', profile.pairedWith);
                        transaction.update(partnerRef, { pairedWith: null });
                    }
                    return;
                }

                const currentGroupData = groupDoc.data() as Group;
                const newMembers = { ...currentGroupData.members };
                delete newMembers[user.uid];

                // Update user's profile
                transaction.update(userProfileRef, { groupId: null, pairedWith: null });

                // Unpair the partner if they exist
                if (profile.pairedWith) {
                    const partnerProfileRef = doc(firestore, 'users', profile.pairedWith);
                    transaction.update(partnerProfileRef, { pairedWith: null });
                }

                if (Object.keys(newMembers).length === 0) {
                    // If the user is the last member, delete the group
                    transaction.delete(groupRef);
                } else {
                    let groupUpdateData: { members: any, [key: string]: any } = { members: newMembers };

                    // If the leaving user was an admin and the only admin, promote another member.
                    const wasAdmin = currentGroupData.members[user.uid] === 'admin';
                    const otherAdmins = Object.keys(newMembers).filter(uid => newMembers[uid] === 'admin');

                    if (wasAdmin && otherAdmins.length === 0) {
                        // Find a co-admin to promote
                        let newAdminUid = Object.keys(newMembers).find(uid => newMembers[uid] === 'co-admin');
                        // If no co-admin, find any member to promote
                        if (!newAdminUid) {
                            newAdminUid = Object.keys(newMembers)[0];
                        }
                        if (newAdminUid) {
                            newMembers[newAdminUid] = 'admin';
                            groupUpdateData.members = newMembers;
                        }
                    }
                    transaction.update(groupRef, groupUpdateData);
                }
            });

            toast({ title: 'Group Left', description: 'You have successfully left the group.' });
            refetch();
        } catch (error: any) {
            console.error("Error leaving group:", error);
            toast({ title: 'Error', description: 'Failed to leave group. Please try again.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
            setConfirmation(null);
        }
    }


    async function executeMemberAction(
        memberUid: string,
        action: 'make-admin' | 'make-co-admin' | 'make-member' | 'kick',
        options: { kickBothPaired?: boolean } = {}
    ) {
        if (!user || !firestore || !group || user.uid === memberUid) return;

        setIsSaving(true);

        try {
            const batch = writeBatch(firestore);
            const groupRef = doc(firestore, 'groups', group.id);

            const groupDoc = await getDoc(groupRef);
            if (!groupDoc.exists()) throw new Error("Group not found.");

            let currentMembers = groupDoc.data().members;
            const updatePayload: { [key: string]: any } = {};

            if (action === 'kick') {
                const memberToKickSnap = await getDoc(doc(firestore, 'users', memberUid));
                if (!memberToKickSnap.exists()) throw new Error("Member to kick not found.");
                const memberToKick = memberToKickSnap.data() as UserProfile;

                // This field is used by security rules to check permission
                updatePayload.lastKickedUid = memberUid;

                delete currentMembers[memberUid];
                batch.update(doc(firestore, 'users', memberUid), { groupId: null, pairedWith: null });

                if (memberToKick.pairedWith) {
                    const partnerRef = doc(firestore, 'users', memberToKick.pairedWith);
                    // If kickBoth is true AND the partner is not the current user (admin/co-admin)
                    if (options.kickBothPaired && memberToKick.pairedWith !== user.uid) {
                        delete currentMembers[memberToKick.pairedWith];
                        batch.update(partnerRef, { groupId: null, pairedWith: null });
                    } else {
                        // Always unpair the partner, even if not kicking them
                        batch.update(partnerRef, { pairedWith: null });
                    }
                }
                updatePayload.members = currentMembers;

            } else if (action === 'make-admin') {
                currentMembers[user.uid] = 'co-admin';
                currentMembers[memberUid] = 'admin';
                updatePayload.members = currentMembers;
            } else if (action === 'make-co-admin') {
                currentMembers[memberUid] = 'co-admin';
                updatePayload.members = currentMembers;
            } else if (action === 'make-member') {
                currentMembers[memberUid] = 'member';
                updatePayload.members = currentMembers;
            }

            batch.update(groupRef, updatePayload);
            await batch.commit();
            toast({ title: 'Success', description: 'Group member updated.' });
        } catch (error: any) {
            console.error("Error updating member role: ", error);
            toast({ title: 'Error', description: error.message || 'Could not update member.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
            setConfirmation(null);
            setKickPairConfirmation(null);
        }
    }

    const handleMemberAction = (member: UserProfile, action: 'make-admin' | 'make-co-admin' | 'make-member' | 'kick') => {
        const memberUid = member.uid;

        const onConfirm = (options = {}) => () => executeMemberAction(memberUid, action, options);

        if (action === 'kick') {
            if (member.pairedWith) {
                const partner = groupMembers.find(m => m.uid === member.pairedWith);
                if (partner) {
                    setKickPairConfirmation({ member, partner });
                    return;
                }
            }
            setConfirmation({
                title: `Kick ${member.displayName}?`,
                description: "They will be removed from the group and will need a new invitation to rejoin. Are you sure?",
                onConfirm: onConfirm(),
            });
        } else if (action === 'make-admin') {
            setConfirmation({
                title: `Make ${member.displayName} Admin?`,
                description: `You will be demoted to a Co-Admin. ${member.displayName} will become the new group admin.`,
                onConfirm: onConfirm(),
            });
        } else if (action === 'make-co-admin') {
            setConfirmation({
                title: `Make ${member.displayName} Co-Admin?`,
                description: "They will be able to invite other members.",
                onConfirm: onConfirm(),
            });
        } else if (action === 'make-member') {
            setConfirmation({
                title: `Make ${member.displayName} a Member?`,
                description: "Their Co-Admin permissions will be revoked.",
                onConfirm: onConfirm(),
            });
        }
    };

    // --- Pairing Handlers ---

    async function onSendPairInvite(data: PairInviteValues) {
        if (!user || !firestore || !profile) return;
        setIsSaving(true);
        try {
            if (data.email.toLowerCase() === user.email?.toLowerCase()) {
                toast({ title: "Cannot invite yourself", variant: 'destructive' });
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

            // Simplified Pairing Rules
            if (profile.groupId !== receiver.groupId) {
                toast({ title: "Pairing Blocked", description: "You can only pair with users who are in the same group as you, or if you are both not in any group.", variant: 'destructive' });
                setIsSaving(false);
                return;
            }

            if (receiver.pairedWith) {
                toast({ title: "User already paired", description: `${receiver.displayName} is already paired with someone else.`, variant: 'destructive' });
                setIsSaving(false);
                return;
            }

            const existingInviteQuery = query(collection(firestore, 'pair_invitations'),
                where('senderId', '==', user.uid),
                where('receiverId', '==', receiver.uid),
                where('status', '==', 'pending'));
            const existingInviteSnap = await getDocs(existingInviteQuery);
            if (!existingInviteSnap.empty) {
                toast({ title: "Invite already sent", description: `You have already sent a pending invite to ${receiver.displayName}.` });
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
        } catch (e: any) {
            toast({ title: "Error sending invite", description: e.message, variant: 'destructive' });
        } finally { setIsSaving(false); }
    }

    const executePairing = useCallback(async (invitation: PairInvitation) => {
        if (!user || !firestore) return;
        setIsSaving(true);

        const senderRef = doc(firestore, 'users', invitation.senderId);
        const receiverRef = doc(firestore, 'users', user.uid);
        const invRef = doc(firestore, 'pair_invitations', invitation.id);

        try {
            await runTransaction(firestore, async (transaction) => {
                const senderDoc = await transaction.get(senderRef);
                const receiverDoc = await transaction.get(receiverRef);

                if (!senderDoc.exists() || !receiverDoc.exists()) {
                    throw new Error("User not found.");
                }

                const senderProfile = senderDoc.data() as UserProfile;
                const receiverProfile = receiverDoc.data() as UserProfile;

                // CRITICAL CHECK: Ensure both users are in the same pairing state (same group or both solo)
                if (senderProfile.groupId !== receiverProfile.groupId) {
                    throw new Error("Pairing failed. Both users must be in the same group, or both must not be in a group.");
                }

                transaction.update(senderRef, { pairedWith: user.uid });
                transaction.update(receiverRef, { pairedWith: invitation.senderId });
                transaction.update(invRef, { status: 'accepted' });
            });

            toast({ title: "Pairing successful!", description: `You are now paired with ${invitation.senderName}.` });
            refetch();

        } catch (e: any) {
            console.error("Error executing pairing:", e);
            toast({
                title: 'Pairing Failed',
                description: e.message || 'Could not complete pairing action. The other user\'s status might have changed.',
                variant: 'destructive'
            });
            // Also mark the invite as declined so it doesn't show up anymore
            try {
                await updateDoc(invRef, { status: 'declined' });
            } catch (declineError) {
                // Ignore errors on declining the failed invite
            }
        } finally {
            setIsSaving(false);
        }
    }, [user, firestore, refetch, toast]);


    async function handlePairInvitationAction(invitation: PairInvitation, action: 'accept' | 'decline' | 'cancel') {
        if (!user || !firestore || !profile) return;

        if (action === 'accept') {
            await executePairing(invitation);

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

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
        }
    };


    // --- Render Functions ---

    if (isUserLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-[var(--app-bg)]"><Loader2 className="h-12 w-12 animate-spin text-slate-500 dark:text-slate-400" /></div>;
    }

    const renderPairingManagement = () => {
        if (isPairingLoading) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-40" /></CardTitle>
                        <Skeleton className="h-4 w-full mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            );
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
                                <AvatarImage src={pairedPartner.photoURL || undefined} />
                                <AvatarFallback>{getInitials(pairedPartner.displayName)}</AvatarFallback>
                            </Avatar>
                            <p>You are currently paired with <span className="font-bold">{pairedPartner.displayName}</span>.</p>
                        </div>
                        <Button onClick={onUnpair} disabled={isSaving} className="w-full bg-[--theme-periwinkle-primary] hover:bg-violet-500">
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
                        Send an invitation to another user to pair up. You can only pair with users in your group, or if you're both not in a group.
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
                                <Button type="submit" disabled={isSaving} className="bg-[--theme-periwinkle-primary] hover:bg-violet-500">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}</Button>
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
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-100" onClick={() => handlePairInvitationAction(inv, 'accept')}><Check className="h-4 w-4" /></Button>
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-100" onClick={() => handlePairInvitationAction(inv, 'decline')}><X className="h-4 w-4" /></Button>
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
            return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-40" /></CardTitle>
                        <Skeleton className="h-4 w-full mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <Skeleton className="h-10 w-full" />
                        <Separator />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-24 mb-4" />
                            <Skeleton className="h-10 w-full mb-2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            );
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
                                    <h3 className="font-semibold mb-2 flex items-center gap-2"><UserPlus /> Invite Members by Email</h3>
                                    <Form {...inviteToGroupForm}>
                                        <form onSubmit={inviteToGroupForm.handleSubmit(onInviteToGroup)} className="flex items-start gap-2">
                                            <FormField control={inviteToGroupForm.control} name="email" render={({ field }) => (
                                                <FormItem className="flex-grow"><FormControl><Input placeholder="User's email to invite" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSaving} className="bg-[--theme-periwinkle-primary] hover:bg-violet-500">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}</Button>
                                        </form>
                                    </Form>
                                </div>
                                <div className="space-y-2">
                                    <Label>Or use Invitation Code</Label>
                                    <div className="flex items-center gap-2">
                                        <Input readOnly value={group.invitationCode} className="bg-slate-100" />
                                        <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(group.invitationCode); toast({ title: "Copied!", description: "Invitation code copied to clipboard." }); }}><Copy className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <Separator />
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold mb-2">Members ({groupMembers.length})</h3>
                            <div className="mt-2 space-y-2 rounded-md border p-2">
                                {groupMembers.sort((a, b) => a.displayName.localeCompare(b.displayName)).map(member => (
                                    <div key={member.uid} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={member.photoURL || undefined} alt={member.displayName} />
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
                                            {user?.uid !== member.uid && (
                                                <DropdownMenu>
                                                    {userRoleInGroup === 'admin' && (
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                    )}
                                                    {userRoleInGroup === 'co-admin' && group.members[member.uid] === 'member' && (
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                    )}
                                                    <DropdownMenuContent>
                                                        <DropdownMenuLabel>Manage {member.displayName}</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {userRoleInGroup === 'admin' && group.members[member.uid] !== 'co-admin' &&
                                                            <DropdownMenuItem onClick={() => handleMemberAction(member, 'make-co-admin')}><Star className="mr-2" /> Make Co-Admin</DropdownMenuItem>
                                                        }
                                                        {userRoleInGroup === 'admin' && group.members[member.uid] === 'co-admin' &&
                                                            <DropdownMenuItem onClick={() => handleMemberAction(member, 'make-member')}><UserCog className="mr-2" /> Make Member</DropdownMenuItem>
                                                        }
                                                        {userRoleInGroup === 'admin' && group.members[member.uid] !== 'admin' && <DropdownMenuItem onClick={() => handleMemberAction(member, 'make-admin')}><Crown className="mr-2" /> Make Admin</DropdownMenuItem>}

                                                        {(userRoleInGroup === 'admin' || (userRoleInGroup === 'co-admin' && group.members[member.uid] === 'member')) && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-red-500" onClick={() => handleMemberAction(member, 'kick')}><Trash2 className="mr-2" /> Kick Member</DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Separator />
                        <Button onClick={confirmLeaveGroup} disabled={isSaving} className="w-full bg-[--theme-periwinkle-primary] hover:bg-violet-500">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOutIcon className="mr-2 h-4 w-4" />}
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
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-100" onClick={() => handleGroupInvitation(inv, 'accept')}><Check className="h-4 w-4" /></Button>
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:bg-red-100" onClick={() => handleGroupInvitation(inv, 'decline')}><X className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Separator className="my-4" />
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><KeyRound /> Join a Group with Code</h3>
                        <Form {...joinGroupForm}>
                            <form onSubmit={joinGroupForm.handleSubmit(onJoinGroup)} className="flex items-start gap-2">
                                <FormField control={joinGroupForm.control} name="invitationCode" render={({ field }) => (
                                    <FormItem className="flex-grow"><FormControl><Input placeholder="Enter invitation code" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <Button type="submit" disabled={isSaving} className="bg-[--theme-periwinkle-primary] hover:bg-violet-500">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}</Button>
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
                                <Button type="submit" disabled={isSaving} className="bg-[--theme-periwinkle-primary] hover:bg-violet-500">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</Button>
                            </form>
                        </Form>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const renderConfirmationDialog = () => {
        if (!confirmation) return null;
        return (
            <AlertDialog open={!!confirmation} onOpenChange={() => setConfirmation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmation.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmation(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmation.onConfirm} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    };

    const renderKickPairConfirmationDialog = () => {
        if (!kickPairConfirmation || !user) return null;
        const { member, partner } = kickPairConfirmation;

        // The user performing the action is the current user. Check if they are the partner.
        const isCurrentUserThePartner = partner.uid === user.uid;

        return (
            <AlertDialog open={!!kickPairConfirmation} onOpenChange={() => setKickPairConfirmation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kick Paired Member?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {member.displayName} is paired with {partner.displayName}. How would you like to proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch w-full">
                        {/* Don't show "Kick Both" if the partner is the one doing the kicking */}
                        {!isCurrentUserThePartner && (
                            <Button
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={() => executeMemberAction(member.uid, 'kick', { kickBothPaired: true })}
                                disabled={isSaving}
                            >
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Kick Both {member.displayName} & {partner.displayName}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => executeMemberAction(member.uid, 'kick')}
                            disabled={isSaving}
                        >
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Kick Only {member.displayName} (will unpair them)
                        </Button>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    };

    const DarkModeToggle = () => {
        const { theme, toggleTheme } = useTheme();
        return <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />;
    };

    const ColorSwatch = ({ primary, secondary, text }: { primary: string; secondary: string; text: string; }) => (
        <div className="flex items-center gap-1.5 ml-auto">
            <div style={{ backgroundColor: secondary }} className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"></div>
            <div style={{ backgroundColor: primary }} className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"></div>
            <div style={{ backgroundColor: text }} className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"></div>
        </div>
    );


    return (
        <div className="min-h-screen w-full flex flex-col items-center bg-[var(--app-bg)] p-4 pb-12">
            <div className="w-full max-w-md">
                <div className="flex w-full items-center justify-between mb-4">
                    <Button variant="ghost" onClick={() => router.push('/')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-600 hover:bg-slate-100" aria-label="Logout">
                        <LogOutIcon className="h-5 w-5" />
                    </Button>
                </div>

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
                                        <AvatarImage src={profile?.photoURL || undefined} />
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
                                            <Button onClick={handleSavePhotoUrl} disabled={isSaving} className="bg-[--theme-periwinkle-primary] hover:bg-violet-500">
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <Form {...profileForm}>
                                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                                        <FormField control={profileForm.control} name="displayName" render={({ field }) => (
                                            <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} /></FormControl><FormDescription>This name will be displayed on your task card.</FormDescription><FormMessage /></FormItem>
                                        )} />
                                        {/* Dark Mode Toggle */}
                                        <div className="flex items-center justify-between rounded-lg border dark:border-slate-700 p-4">
                                            <div className="space-y-0.5">
                                                <label className="text-sm font-medium">Dark Mode</label>
                                                <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                                            </div>
                                            <DarkModeToggle />
                                        </div>
                                        <FormField control={profileForm.control} name="cardTheme" render={({ field }) => (
                                            <FormItem className="space-y-3"><FormLabel>Card Theme</FormLabel>
                                                <FormControl>
                                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="periwinkle" /></FormControl>
                                                            <FormLabel className="font-normal flex-1 flex items-center">Periwinkle
                                                                <ColorSwatch primary="#a78bfa" secondary="#f5f3ff" text="#6d28d9" />
                                                            </FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="cyan" /></FormControl>
                                                            <FormLabel className="font-normal flex-1 flex items-center">Cyan
                                                                <ColorSwatch primary="#22d3ee" secondary="#ecfeff" text="#0e7490" />
                                                            </FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="emerald" /></FormControl>
                                                            <FormLabel className="font-normal flex-1 flex items-center">Emerald
                                                                <ColorSwatch primary="#34d399" secondary="#ecfdf5" text="#065f46" />
                                                            </FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl><FormMessage />
                                            </FormItem>
                                        )} />
                                        <Accordion type="single" collapsible className="w-full">
                                            <AccordionItem value="change-password">
                                                <AccordionTrigger>Change Password</AccordionTrigger>
                                                <AccordionContent>
                                                    <div className="space-y-8 pt-4">
                                                        <FormField control={profileForm.control} name="currentPassword" render={({ field }) => (
                                                            <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" placeholder="Enter current password" {...field} /></FormControl><FormDescription>Required only if you want to change your password.</FormDescription><FormMessage /></FormItem>
                                                        )} />
                                                        <FormField control={profileForm.control} name="newPassword" render={({ field }) => (
                                                            <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="Enter new password" {...field} /></FormControl><FormDescription>Leave this blank if you do not want to change your password.</FormDescription><FormMessage /></FormItem>
                                                        )} />
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                        <Button type="submit" disabled={isSaving} className="w-full bg-[--theme-periwinkle-primary] hover:bg-violet-500">
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

                {renderConfirmationDialog()}
                {renderKickPairConfirmationDialog()}

            </div>
        </div>
    );
}
