import apiClient from './axios';

interface ApiEnvelope<T> {
  data: T;
}

export interface PublicUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  isOnline: boolean;
  createdAt?: string;
}

export interface ProfileUpdatedEvent {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface UserPage {
  users: PublicUser[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderSnapshot: { displayName: string; avatarUrl: string | null };
  content: string;
  clientMessageId: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  participant: PublicUser;
  lastMessage: MessageRecord | null;
  lastActivityAt: string;
  unreadCount: number;
  clearedAt: string | null;
  lastReadAt: string | null;
  lastReadMessageId: string | null;
}

export interface ConversationPage {
  conversations: ConversationRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessageHistoryPage {
  messages: MessageRecord[];
  nextCursor: string | null;
  hasMore: boolean;
  clearedAt: string | null;
  receiptState: {
    lastReadAt: string | null;
    lastReadMessageId: string | null;
    lastDeliveredAt: string | null;
    lastDeliveredMessageAt: string | null;
    lastDeliveredMessageId: string | null;
  } | null;
}

export interface AvatarUploadSignature {
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  publicId: string;
  uploadPreset: string;
  allowedFormats: string[];
  maxBytes: number;
  uploadUrl: string;
}

export const chatQueryKeys = {
  currentUser: ['auth', 'current-user'] as const,
  users: (query: string) => ['users', query] as const,
  conversations: ['conversations'] as const,
  profile: (userId: string) => ['users', 'profile', userId] as const,
  messages: (conversationId: string) => ['conversations', conversationId, 'messages'] as const,
};

export async function getUsers(input: {
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<UserPage> {
  const response = await apiClient.get<ApiEnvelope<UserPage>>('/users', {
    params: { cursor: input.cursor ?? undefined, limit: input.limit },
    signal: input.signal,
  });
  return response.data.data;
}

export async function searchUsers(input: {
  query: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<UserPage> {
  const response = await apiClient.get<ApiEnvelope<UserPage>>('/users/search', {
    params: {
      q: input.query,
      cursor: input.cursor ?? undefined,
      limit: input.limit,
    },
    signal: input.signal,
  });
  return response.data.data;
}

export async function getPublicUser(userId: string, signal?: AbortSignal): Promise<PublicUser> {
  const response = await apiClient.get<ApiEnvelope<{ user: PublicUser }>>(`/users/${userId}`, { signal });
  return response.data.data.user;
}

export async function getConversations(input: {
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<ConversationPage> {
  const response = await apiClient.get<ApiEnvelope<ConversationPage>>('/conversations', {
    params: { cursor: input.cursor ?? undefined, limit: input.limit },
    signal: input.signal,
  });
  return response.data.data;
}

export async function getMessages(input: {
  conversationId: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
}): Promise<MessageHistoryPage> {
  const response = await apiClient.get<ApiEnvelope<MessageHistoryPage>>(
    `/conversations/${input.conversationId}/messages`,
    {
      params: { cursor: input.cursor ?? undefined, limit: input.limit },
      signal: input.signal,
    },
  );
  return response.data.data;
}

export async function createDirectConversation(userId: string): Promise<string> {
  const response = await apiClient.post<ApiEnvelope<{ conversationId: string }>>(
    `/conversations/direct/${userId}`,
    {},
  );
  return response.data.data.conversationId;
}

export async function clearConversation(conversationId: string): Promise<{ clearedAt: string }> {
  const response = await apiClient.post<ApiEnvelope<{ clearedAt: string }>>(
    `/conversations/${conversationId}/clear`,
    {},
  );
  return response.data.data;
}

export async function markConversationRead(input: {
  conversationId: string;
  messageId: string;
}): Promise<{ lastReadAt: string | null; lastReadMessageId: string | null }> {
  const response = await apiClient.post<ApiEnvelope<{
    lastReadAt: string | null;
    lastReadMessageId: string | null;
  }>>(
    `/conversations/${input.conversationId}/read`,
    { messageId: input.messageId },
  );
  return response.data.data;
}

export async function updateMyProfile(input: {
  displayName?: string;
  avatarPublicId?: string;
}): Promise<{ id: string; displayName: string; email: string; avatarUrl: string | null }> {
  const response = await apiClient.patch<ApiEnvelope<{ user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
  } }>>('/users/me/profile', input);
  return response.data.data.user;
}

export async function requestAvatarUploadSignature(): Promise<AvatarUploadSignature> {
  const response = await apiClient.post<ApiEnvelope<AvatarUploadSignature>>(
    '/uploads/avatar/signature',
    {},
  );
  return response.data.data;
}

export async function uploadAvatarImage(
  file: File,
  signature: AvatarUploadSignature,
  signal?: AbortSignal,
): Promise<string> {
  const format = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  if (!signature.allowedFormats.includes(format) || file.size > signature.maxBytes) {
    throw new Error('Choose a JPG, PNG, or WebP image smaller than 5 MB.');
  }

  const formData = new FormData();
  formData.set('file', file);
  formData.set('api_key', signature.apiKey);
  formData.set('timestamp', String(signature.timestamp));
  formData.set('signature', signature.signature);
  formData.set('folder', signature.folder);
  formData.set('public_id', signature.publicId);
  formData.set('upload_preset', signature.uploadPreset);
  formData.set('allowed_formats', signature.allowedFormats.join(','));
  formData.set('overwrite', 'false');

  const response = await fetch(signature.uploadUrl, { method: 'POST', body: formData, signal });
  const payload = await response.json() as { public_id?: string };
  const expectedFolderPublicId = `${signature.folder}/${signature.publicId}`;
  if (
    !response.ok ||
    (payload.public_id !== signature.publicId && payload.public_id !== expectedFolderPublicId)
  ) {
    throw new Error('Avatar upload failed. Try another image.');
  }
  return payload.public_id;
}
