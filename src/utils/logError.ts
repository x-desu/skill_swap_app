import { getFirestore, collection, addDoc } from '@react-native-firebase/firestore';

export const logError = async (error: any, context: string) => {
  try {
    await addDoc(collection(getFirestore(), 'logs'), {
      message: error?.message || "Unknown error",
      context,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.log("Logging failed", e);
  }
};
