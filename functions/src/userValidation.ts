import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { ImageAnnotatorClient } from '@google-cloud/vision';

const visionClient = new ImageAnnotatorClient();

/**
 * Trigger: validateUserProfile
 * Path: users/{userId}
 * Triggered when a user profile is updated.
 * Performs AI validation on the profile photo if the status is 'pending_validation'.
 */
export const validateUserProfile = onDocumentUpdated({
  document: 'users/{userId}',
  region: 'asia-south1'
}, async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  const userId = event.params.userId;

  if (!afterData) return;

  // Only trigger if status is explicitly set to 'pending_validation'
  // and it wasn't already 'pending_validation' (to avoid loops)
  if (afterData.isProfileComplete !== 'pending_validation' || beforeData?.isProfileComplete === 'pending_validation') {
    return;
  }

  console.log(`[Validation] Starting AI analysis for user: ${userId}`);
  const photoURL = afterData.photoURL;

  if (!photoURL) {
    console.log(`[Validation] No photo found for user ${userId}, marking incomplete.`);
    await admin.firestore().collection('users').doc(userId).update({
      isProfileComplete: false,
      validationError: 'Profile photo is required.'
    });
    return;
  }

  try {
    // 1. Run Vision AI analysis (Face Detection and Safe Search)
    const [result] = await visionClient.annotateImage({
      image: { source: { imageUri: photoURL } },
      features: [
        { type: 'FACE_DETECTION' },
        { type: 'SAFE_SEARCH_DETECTION' }
      ]
    });

    const faces = result.faceAnnotations || [];
    const safeSearch = result.safeSearchAnnotation;

    let isValid = true;
    let errorMessage = '';

    // 2. Validate Face Presence
    if (faces.length === 0) {
      isValid = false;
      errorMessage = 'No human face detected. Please upload a clear profile photo of yourself.';
    } else if (faces.length > 1) {
      // Optional: limit to 1 face for clarity, but maybe let it slide if secondary faces are small
      // For now, just ensure at least one.
    }

    // 3. Validate Safe Search (Adult, Violence, etc.)
    if (safeSearch) {
      const isAdult = ['LIKELY', 'VERY_LIKELY'].includes(String(safeSearch.adult || ''));
      const isViolence = ['LIKELY', 'VERY_LIKELY'].includes(String(safeSearch.violence || ''));
      const isRacy = ['LIKELY', 'VERY_LIKELY'].includes(String(safeSearch.racy || ''));

      if (isAdult || isViolence || isRacy) {
        isValid = false;
        errorMessage = 'Image flagged for inappropriate content. Please upload a community-safe photo.';
      }
    }

    // 4. Update Firestore with high-privilege result
    if (isValid) {
      console.log(`[Validation] User ${userId} passed AI verification.`);
      await admin.firestore().collection('users').doc(userId).update({
        isProfileComplete: true,
        validationError: null,
        lastValidatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      console.log(`[Validation] User ${userId} failed verification: ${errorMessage}`);
      await admin.firestore().collection('users').doc(userId).update({
        isProfileComplete: false,
        validationError: errorMessage,
        lastValidatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

  } catch (error) {
    console.error(`[Validation] Error processing user ${userId}:`, error);
    // On error, we might want to let it stay in pending or mark as failed
    await admin.firestore().collection('users').doc(userId).update({
      isProfileComplete: false,
      validationError: 'AI Validation service currently unavailable. Please try again later.'
    });
  }
});
