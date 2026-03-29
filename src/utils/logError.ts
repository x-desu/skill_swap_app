import firestore from '@react-native-firebase/firestore';

export const logError = async (error: any, context: string) => {
  try {
    await firestore().collection('logs').add({
      message: error?.message || "Unknown error",
      context,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.log("Logging failed", e);
  }
};
