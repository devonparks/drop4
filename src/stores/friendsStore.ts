import { create } from 'zustand';
import { saveState, loadState } from '../services/storage';

export interface Friend {
  uid: string;
  displayName: string;
  avatarId: string;
  level: number;
  elo: number;
  tier: string;
  isOnline: boolean;
  lastSeen: number;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
}

interface FriendsState {
  friends: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];

  // Actions
  addFriend: (friend: Friend) => void;
  removeFriend: (uid: string) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  sendRequest: (request: FriendRequest) => void;
  cancelOutgoingRequest: (requestId: string) => void;
  updateFriendStatus: (uid: string, isOnline: boolean) => void;
  setFriends: (friends: Friend[]) => void;
  setIncomingRequests: (requests: FriendRequest[]) => void;
  setOutgoingRequests: (requests: FriendRequest[]) => void;
  loadFromStorage: () => Promise<void>;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],

  addFriend: (friend) => {
    set((state) => {
      // Avoid duplicates
      if (state.friends.some((f) => f.uid === friend.uid)) return state;
      return { friends: [...state.friends, friend] };
    });
  },

  removeFriend: (uid) => {
    set((state) => ({
      friends: state.friends.filter((f) => f.uid !== uid),
    }));
  },

  acceptRequest: (requestId) => {
    set((state) => ({
      incomingRequests: state.incomingRequests.filter((r) => r.id !== requestId),
    }));
  },

  declineRequest: (requestId) => {
    set((state) => ({
      incomingRequests: state.incomingRequests.filter((r) => r.id !== requestId),
    }));
  },

  sendRequest: (request) => {
    set((state) => ({
      outgoingRequests: [...state.outgoingRequests, request],
    }));
  },

  cancelOutgoingRequest: (requestId) => {
    set((state) => ({
      outgoingRequests: state.outgoingRequests.filter((r) => r.id !== requestId),
    }));
  },

  updateFriendStatus: (uid, isOnline) => {
    set((state) => ({
      friends: state.friends.map((f) =>
        f.uid === uid ? { ...f, isOnline, lastSeen: isOnline ? Date.now() : f.lastSeen } : f
      ),
    }));
  },

  setFriends: (friends) => set({ friends }),
  setIncomingRequests: (requests) => set({ incomingRequests: requests }),
  setOutgoingRequests: (requests) => set({ outgoingRequests: requests }),

  loadFromStorage: async () => {
    const saved = await loadState<Partial<FriendsState>>('friends');
    if (saved) {
      set({
        friends: saved.friends ?? [],
        incomingRequests: saved.incomingRequests ?? [],
        outgoingRequests: saved.outgoingRequests ?? [],
      });
    }
  },
}));

// Auto-save on state change
useFriendsStore.subscribe((state) => {
  saveState('friends', {
    friends: state.friends,
    incomingRequests: state.incomingRequests,
    outgoingRequests: state.outgoingRequests,
  });
});
