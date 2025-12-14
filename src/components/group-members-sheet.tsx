
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/lib/types';
import { User } from 'lucide-react';

interface GroupMembersSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  members: UserProfile[];
  onSelectMember: (uid: string) => void;
  currentUserId: string;
}

export function GroupMembersSheet({
  isOpen,
  onOpenChange,
  members,
  onSelectMember,
  currentUserId,
}: GroupMembersSheetProps) {
  // Sort members to show the current user first, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.uid === currentUserId) return -1;
    if (b.uid === currentUserId) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] flex flex-col">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-2xl">Group Members</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-grow">
          <div className="flex flex-col gap-2 pr-4">
            {sortedMembers.map((member) => (
              <Button
                key={member.uid}
                variant="ghost"
                className="w-full h-auto justify-start p-2"
                onClick={() => onSelectMember(member.uid)}
              >
                <Avatar className="h-9 w-9 mr-3">
                  <AvatarImage src={member.photoURL} alt={member.displayName} />
                  <AvatarFallback className="bg-slate-200 text-slate-600 font-bold">
                    {getInitials(member.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                    <span className="font-semibold text-base">{member.displayName}</span>
                    {member.uid === currentUserId && (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <User className="h-3 w-3"/> You
                        </span>
                    )}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
