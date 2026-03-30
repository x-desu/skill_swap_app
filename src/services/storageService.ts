import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
  deleteObject,
} from '@react-native-firebase/storage';

/**
 * Uploads a local image URI to Firebase Storage at users/{uid}/avatar.jpg
 * and returns the permanent HTTPS download URL.
 */
export const uploadProfilePhoto = async (uid: string, localUri: string): Promise<string> => {
  const storageRef = ref(getStorage(), `users/${uid}/avatar.jpg`);
  await putFile(storageRef, localUri);
  return getDownloadURL(storageRef);
};

/**
 * Delete the user's current profile photo from Storage.
 * Call this before uploading a new one or when the user removes their photo.
 */
export const deleteProfilePhoto = async (uid: string): Promise<void> => {
  try {
    const storageRef = ref(getStorage(), `users/${uid}/avatar.jpg`);
    await deleteObject(storageRef);
  } catch {
    // File may not exist — safe to ignore
  }
};
