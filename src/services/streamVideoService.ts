import { StreamVideoClient } from '@stream-io/video-react-native-sdk';
import { getStreamVideoToken } from './videoCallService';

interface StreamUserIdentity {
  id: string;
  name?: string;
  image?: string;
}

let activeClient: StreamVideoClient | null = null;
let activeUserId: string | null = null;

export async function ensureStreamVideoClient(
  user: StreamUserIdentity,
): Promise<StreamVideoClient> {
  if (activeClient && activeUserId === user.id) {
    return activeClient;
  }

  if (activeClient) {
    try {
      await activeClient.disconnectUser();
    } catch (error) {
      console.warn('[StreamVideoService] Failed to disconnect previous Stream client:', error);
    } finally {
      activeClient = null;
      activeUserId = null;
    }
  }

  const initialCredentials = await getStreamVideoToken();
  if (!initialCredentials.apiKey?.trim()) {
    throw new Error('Stream is not configured on the server yet. Add STREAM_API_KEY and STREAM_API_SECRET.');
  }

  let cachedToken: string | null = initialCredentials.token;
  const tokenProvider = async () => {
    if (cachedToken) {
      const token = cachedToken;
      cachedToken = null;
      return token;
    }

    const refreshedCredentials = await getStreamVideoToken();
    return refreshedCredentials.token;
  };

  const client = new StreamVideoClient(initialCredentials.apiKey);

  try {
    await client.connectUser(
      {
        id: user.id,
        name: user.name,
        image: user.image,
      },
      tokenProvider,
    );

    activeClient = client;
    activeUserId = user.id;
    return client;
  } catch (error) {
    try {
      await client.disconnectUser();
    } catch (_) {
      // Best effort cleanup after a failed connect.
    }
    throw error;
  }
}

export async function disconnectStreamVideoClient(): Promise<void> {
  if (!activeClient) {
    return;
  }

  try {
    await activeClient.disconnectUser();
  } catch (error) {
    console.warn('[StreamVideoService] Failed to disconnect Stream client:', error);
  } finally {
    activeClient = null;
    activeUserId = null;
  }
}
