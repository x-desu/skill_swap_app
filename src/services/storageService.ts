import storage from '@react-native-firebase/storage';

/**
 * Uploads a local image URI to Firebase Storage at users/{uid}/avatar.jpg
 * and returns the permanent HTTPS download URL.
 */
export const uploadProfilePhoto = async (uid: string, localUri: string): Promise<string> => {
  const ref = storage().ref(`users/${uid}/avatar.jpg`);
  await ref.putFile(localUri);
  return ref.getDownloadURL();
};

/**
 * Delete the user's current profile photo from Storage.
 * Call this before uploading a new one or when the user removes their photo.
 */
export const deleteProfilePhoto = async (uid: string): Promise<void> => {
  try {
    const ref = storage().ref(`users/${uid}/avatar.jpg`);
    await ref.delete();
  } catch {
    // File may not exist — safe to ignore
  }
};
