
'use server';
/**
 * @fileOverview A server-side flow for handling group-related actions.
 * This is a more secure way to handle database mutations that require bypassing
 * restrictive client-side security rules.
 *
 * - joinGroup - A flow that allows a user to join a group using an invitation code.
 */

import { adminFirestore } from '@/firebase/admin';
import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';

// Define the input schema for the joinGroup flow
export const JoinGroupInputSchema = z.object({
  userId: z.string().describe('The UID of the user trying to join the group.'),
  invitationCode: z.string().describe('The invitation code for the group.'),
});
export type JoinGroupInput = z.infer<typeof JoinGroupInputSchema>;

// Define the output schema for the joinGroup flow
export const JoinGroupOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  groupName: z.string().optional(),
});
export type JoinGroupOutput = z.infer<typeof JoinGroupOutputSchema>;


/**
 * A server-side flow to allow a user to join a group.
 * This bypasses client-side security rules for a controlled, secure mutation.
 * @param {JoinGroupInput} input - The user ID and invitation code.
 * @returns {Promise<JoinGroupOutput>} - The result of the operation.
 */
export const joinGroupFlow = ai.defineFlow(
  {
    name: 'joinGroupFlow',
    inputSchema: JoinGroupInputSchema,
    outputSchema: JoinGroupOutputSchema,
  },
  async (input) => {
    const { userId, invitationCode } = input;
    const db = adminFirestore();

    // Find the group with the given invitation code
    const groupsRef = db.collection('groups');
    const q = groupsRef.where('invitationCode', '==', invitationCode).limit(1);

    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return { success: false, message: 'Invalid invitation code.' };
    }

    const groupDoc = querySnapshot.docs[0];
    const groupId = groupDoc.id;
    const groupData = groupDoc.data();

    // Check if user is already a member
    if (groupData.members && groupData.members[userId]) {
        return { success: false, message: 'You are already a member of this group.' };
    }

    // Use a batch write to update both documents atomically
    const batch = db.batch();

    // 1. Update the group document to add the new member
    const groupRef = db.collection('groups').doc(groupId);
    batch.update(groupRef, { [`members.${userId}`]: 'member' });
    
    // 2. Update the user's profile to add the groupId
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, { groupId: groupId });

    try {
      await batch.commit();
      return { success: true, groupName: groupData.name };
    } catch (error) {
      console.error('Error joining group in flow:', error);
      return { success: false, message: 'An internal error occurred while joining the group.' };
    }
  }
);


// Export a wrapper function for client-side usage
export async function joinGroup(input: JoinGroupInput): Promise<JoinGroupOutput> {
  return joinGroupFlow(input);
}
