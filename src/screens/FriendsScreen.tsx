import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useFriendsStore, Friend, FriendRequest } from '../stores/friendsStore';
import { useShopStore } from '../stores/shopStore';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend as removeFriendService,
  listenForFriendRequests,
  listenForOutgoingRequests,
  listenForFriends,
  searchPlayers,
  inviteToMatch,
} from '../services/friends';
import { getCurrentUser } from '../services/firebase';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { RANKED_TIERS } from '../stores/rankedStore';

type FriendsTab = 'friends' | 'requests' | 'add';

// ============ FRIEND CARD ============

function FriendCard({
  friend,
  onInvite,
  onRemove,
}: {
  friend: Friend;
  onInvite: (uid: string) => void;
  onRemove: (uid: string) => void;
}) {
  const tierInfo = RANKED_TIERS.find((t) => t.id === friend.tier) ?? RANKED_TIERS[0];

  return (
    <View style={styles.friendCard}>
      {/* Online indicator */}
      <View style={styles.avatarArea}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>
            {friend.avatarId === 'default' ? '👤' : '🎮'}
          </Text>
        </View>
        <View
          style={[
            styles.onlineDot,
            { backgroundColor: friend.isOnline ? colors.green : colors.textMuted },
          ]}
        />
      </View>

      {/* Info */}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.displayName}</Text>
        <View style={styles.friendMeta}>
          <Text style={styles.friendLevel}>Lv.{friend.level}</Text>
          <Text style={styles.friendDivider}>|</Text>
          <Text style={[styles.friendTier, { color: tierInfo.color }]}>
            {tierInfo.icon} {tierInfo.name}
          </Text>
          <Text style={styles.friendDivider}>|</Text>
          <Text style={styles.friendElo}>{friend.elo} ELO</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.friendActions}>
        {friend.isOnline && (
          <Pressable
            onPress={() => {
              haptics.tap();
              onInvite(friend.uid);
            }}
            style={styles.inviteBtn}
          >
            <LinearGradient
              colors={['#34c94d', '#27ae3d', '#1e8a30']}
              style={styles.inviteBtnGrad}
            >
              <Text style={styles.inviteBtnText}>Invite</Text>
            </LinearGradient>
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            haptics.tap();
            onRemove(friend.uid);
          }}
          style={styles.removeBtn}
        >
          <Text style={styles.removeBtnText}>X</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ============ REQUEST CARD ============

function IncomingRequestCard({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const timeAgo = getTimeAgo(request.timestamp);

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestAvatar}>
        <Text style={styles.avatarEmoji}>👤</Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.fromName}</Text>
        <Text style={styles.requestTime}>{timeAgo}</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          onPress={() => {
            haptics.tap();
            onAccept(request.id);
          }}
        >
          <LinearGradient
            colors={['#34c94d', '#27ae3d', '#1e8a30']}
            style={styles.acceptBtn}
          >
            <Text style={styles.actionBtnText}>Accept</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={() => {
            haptics.tap();
            onDecline(request.id);
          }}
          style={styles.declineBtn}
        >
          <Text style={styles.declineBtnText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OutgoingRequestCard({
  request,
  onCancel,
}: {
  request: FriendRequest;
  onCancel: (id: string) => void;
}) {
  const timeAgo = getTimeAgo(request.timestamp);

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestAvatar}>
        <Text style={styles.avatarEmoji}>👤</Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.toName}</Text>
        <Text style={styles.requestTime}>Sent {timeAgo}</Text>
      </View>
      <Pressable
        onPress={() => {
          haptics.tap();
          onCancel(request.id);
        }}
        style={styles.cancelBtn}
      >
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

// ============ SEARCH RESULT CARD ============

function SearchResultCard({
  player,
  onAdd,
  alreadyFriend,
  alreadySent,
}: {
  player: { uid: string; displayName: string; level: number; elo: number };
  onAdd: (uid: string) => void;
  alreadyFriend: boolean;
  alreadySent: boolean;
}) {
  return (
    <View style={styles.searchResultCard}>
      <View style={styles.requestAvatar}>
        <Text style={styles.avatarEmoji}>👤</Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{player.displayName}</Text>
        <Text style={styles.requestTime}>
          Lv.{player.level} | {player.elo} ELO
        </Text>
      </View>
      {alreadyFriend ? (
        <View style={styles.alreadyBadge}>
          <Text style={styles.alreadyBadgeText}>Friends</Text>
        </View>
      ) : alreadySent ? (
        <View style={styles.sentBadge}>
          <Text style={styles.sentBadgeText}>Sent</Text>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            haptics.tap();
            onAdd(player.uid);
          }}
        >
          <LinearGradient
            colors={['#ffa733', '#ff8c00', '#cc7000']}
            style={styles.addFriendBtn}
          >
            <Text style={styles.addFriendBtnText}>+ Add</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

// ============ EMPTY STATES ============

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

// ============ HELPERS ============

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============ MAIN SCREEN ============

export function FriendsScreen() {
  const navigation = useNavigation<any>();
  const { coins, gems, level } = useShopStore();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    setFriends,
    setIncomingRequests,
    setOutgoingRequests,
    addFriend,
    removeFriend,
    acceptRequest,
    declineRequest,
    sendRequest,
    cancelOutgoingRequest,
  } = useFriendsStore();

  const [activeTab, setActiveTab] = useState<FriendsTab>('friends');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<
    { uid: string; displayName: string; level: number; elo: number }[]
  >([]);
  const [searching, setSearching] = useState(false);

  // Firebase listeners
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const unsubFriends = listenForFriends((f) => setFriends(f));
    if (unsubFriends) unsubs.push(unsubFriends);

    const unsubIncoming = listenForFriendRequests((r) => setIncomingRequests(r));
    if (unsubIncoming) unsubs.push(unsubIncoming);

    const unsubOutgoing = listenForOutgoingRequests((r) => setOutgoingRequests(r));
    if (unsubOutgoing) unsubs.push(unsubOutgoing);

    return () => unsubs.forEach((u) => u());
  }, []);

  // Search debounce
  useEffect(() => {
    if (searchText.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(async () => {
      const results = await searchPlayers(searchText);
      setSearchResults(results);
      setSearching(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchText]);

  const handleAccept = useCallback(async (requestId: string) => {
    const success = await acceptFriendRequest(requestId);
    if (success) acceptRequest(requestId);
  }, []);

  const handleDecline = useCallback(async (requestId: string) => {
    const success = await declineFriendRequest(requestId);
    if (success) declineRequest(requestId);
  }, []);

  const handleCancel = useCallback(async (requestId: string) => {
    const success = await cancelFriendRequest(requestId);
    if (success) cancelOutgoingRequest(requestId);
  }, []);

  const handleRemove = useCallback(async (uid: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await removeFriendService(uid);
            if (success) removeFriend(uid);
          },
        },
      ]
    );
  }, []);

  const handleInvite = useCallback(async (uid: string) => {
    const id = await inviteToMatch(uid, 'casual');
    if (id) {
      Alert.alert('Invite Sent', 'Waiting for your friend to accept...');
    }
  }, []);

  const handleAddFriend = useCallback(async (uid: string) => {
    const id = await sendFriendRequest(uid);
    if (id) {
      Alert.alert('Request Sent', 'Friend request sent!');
    }
  }, []);

  const currentUid = getCurrentUser()?.uid ?? '';

  const tabs: { key: FriendsTab; label: string; badge?: number }[] = [
    { key: 'friends', label: 'Friends' },
    { key: 'requests', label: 'Requests', badge: incomingRequests.length },
    { key: 'add', label: 'Add Friend' },
  ];

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        <Text style={styles.title}>FRIENDS</Text>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => {
                haptics.tap();
                setActiveTab(tab.key);
              }}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.badge !== undefined && tab.badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* ═══ FRIENDS TAB ═══ */}
        {activeTab === 'friends' && (
          friends.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No Friends Yet"
              subtitle="Add friends to play together and see their stats!"
            />
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.uid}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <FriendCard
                  friend={item}
                  onInvite={handleInvite}
                  onRemove={handleRemove}
                />
              )}
            />
          )
        )}

        {/* ═══ REQUESTS TAB ═══ */}
        {activeTab === 'requests' && (
          <FlatList
            data={[
              ...incomingRequests.map((r) => ({ ...r, type: 'incoming' as const })),
              ...outgoingRequests.map((r) => ({ ...r, type: 'outgoing' as const })),
            ]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="📬"
                title="No Requests"
                subtitle="Friend requests you send or receive will appear here."
              />
            }
            ListHeaderComponent={
              incomingRequests.length > 0 ? (
                <Text style={styles.sectionHeader}>
                  Incoming ({incomingRequests.length})
                </Text>
              ) : null
            }
            renderItem={({ item, index }) => {
              // Show outgoing section header
              if (
                item.type === 'outgoing' &&
                (index === 0 || (index > 0 && index === incomingRequests.length))
              ) {
                return (
                  <View>
                    <Text style={styles.sectionHeader}>
                      Sent ({outgoingRequests.length})
                    </Text>
                    <OutgoingRequestCard
                      request={item}
                      onCancel={handleCancel}
                    />
                  </View>
                );
              }

              if (item.type === 'incoming') {
                return (
                  <IncomingRequestCard
                    request={item}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                );
              }

              return (
                <OutgoingRequestCard
                  request={item}
                  onCancel={handleCancel}
                />
              );
            }}
          />
        )}

        {/* ═══ ADD FRIEND TAB ═══ */}
        {activeTab === 'add' && (
          <View style={styles.addContainer}>
            {/* Friend Code */}
            <View style={styles.friendCodeCard}>
              <Text style={styles.friendCodeLabel}>YOUR FRIEND CODE</Text>
              <View style={styles.friendCodeRow}>
                <Text style={styles.friendCodeValue}>
                  {currentUid ? currentUid.slice(0, 12).toUpperCase() : '---'}
                </Text>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    // Copy to clipboard would go here
                    Alert.alert('Copied!', 'Friend code copied to clipboard.');
                  }}
                  style={styles.copyBtn}
                >
                  <Text style={styles.copyBtnText}>Copy</Text>
                </Pressable>
              </View>
              <Text style={styles.friendCodeHint}>
                Share this code with friends so they can find you!
              </Text>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputRow}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by player name..."
                  placeholderTextColor={colors.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchText.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setSearchText('');
                      setSearchResults([]);
                    }}
                  >
                    <Text style={styles.clearBtn}>X</Text>
                  </Pressable>
                )}
              </View>

              {searching && (
                <ActivityIndicator
                  color={colors.orange}
                  style={{ marginTop: 16 }}
                />
              )}

              {!searching && searchText.length >= 2 && searchResults.length === 0 && (
                <EmptyState
                  icon="🔍"
                  title="No Players Found"
                  subtitle="Try a different name or check the spelling."
                />
              )}

              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={{ gap: 4, paddingTop: 8 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <SearchResultCard
                    player={item}
                    onAdd={handleAddFriend}
                    alreadyFriend={friends.some((f) => f.uid === item.uid)}
                    alreadySent={outgoingRequests.some(
                      (r) => r.toUid === item.uid
                    )}
                  />
                )}
              />
            </View>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(255,140,0,0.1)',
    borderColor: 'rgba(255,140,0,0.3)',
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.orange,
  },
  tabBadge: {
    backgroundColor: colors.red,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
  },

  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
    gap: 4,
  },

  // ═══ Friend Card ═══
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarArea: {
    position: 'relative',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0a0e27',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  friendMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  friendLevel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  friendDivider: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: 'rgba(255,255,255,0.15)',
  },
  friendTier: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
  },
  friendElo: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inviteBtn: {},
  inviteBtnGrad: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(231,76,60,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  removeBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.red,
  },

  // ═══ Request Card ═══
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  requestAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  requestTime: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  declineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(231,76,60,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
  },
  declineBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.red,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionHeader: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  // ═══ Search / Add Tab ═══
  addContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  friendCodeCard: {
    backgroundColor: 'rgba(255,140,0,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.2)',
    marginBottom: 14,
  },
  friendCodeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  friendCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendCodeValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: 2,
    flex: 1,
  },
  copyBtn: {
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  copyBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.orange,
  },
  friendCodeHint: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 14,
    color: '#ffffff',
    paddingVertical: 8,
  },
  clearBtn: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.textMuted,
    padding: 4,
  },

  // ═══ Search Result Card ═══
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  addFriendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addFriendBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  alreadyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(39,174,61,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(39,174,61,0.3)',
  },
  alreadyBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.green,
  },
  sentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,140,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.25)',
  },
  sentBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.orange,
  },

  // ═══ Empty State ═══
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 20,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
