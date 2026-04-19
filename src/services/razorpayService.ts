import RazorpayCheckout from 'react-native-razorpay';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { Alert } from 'react-native';
import Constants from 'expo-constants';

const FUNCTIONS_REGION = 'asia-south1';

// In production/release APKs, Constants.expoConfig is null.
// We hardcode the live key as the fallback so the paywall always works.
const RAZORPAY_KEY_ID = 'rzp_live_SX039qZ9OOIngV';

function getRazorpayKeyId(): string {
  const key =
    ((Constants.expoConfig?.extra ?? {}) as Record<string, unknown>)?.razorpayKeyId?.toString()
    ?? RAZORPAY_KEY_ID;
  if (!key) {
    throw new Error(
      '[Razorpay] razorpayKeyId is not configured. ' +
      'Add it under expo.extra.razorpayKeyId in app.json.'
    );
  }
  return key;
}

interface OrderResponse {
  id: string;
  amount: number;
  currency: string;
}

/**
 * Handle Razorpay Payment Flow
 * @param amount Amount in INR (must be >= 1)
 * @param credits Number of credits to add
 * @param userEmail User's email for receipt
 * @param userContact User's phone for receipt
 */
export async function startRazorpayPayment(
  amount: number,
  credits: number,
  userEmail?: string,
  userContact?: string
): Promise<boolean> {
  try {
    // Validate minimum amount (Razorpay live mode requires >= ₹1)
    if (amount < 1) {
      Alert.alert('Invalid Amount', 'Minimum payment amount is ₹1.');
      return false;
    }

    const razorpayKeyId = getRazorpayKeyId();
    console.log('[Razorpay Service] Using key:', razorpayKeyId.substring(0, 12) + '...');

    const functionsInstance = getFunctions(undefined, FUNCTIONS_REGION);
    const createRazorpayOrder = httpsCallable(functionsInstance, 'createRazorpayOrder');
    const verifyRazorpayPayment = httpsCallable(functionsInstance, 'verifyRazorpayPayment');

    // 1. Create Order on Backend
    console.log('[Razorpay Service] Creating order:', { amount, credits });
    const orderResult = await createRazorpayOrder({ amount, credits });
    const orderData = orderResult.data as OrderResponse;
    console.log('[Razorpay Service] Order created:', orderData.id);

    // 2. Open Razorpay Checkout
    const options = {
      description: `Purchase ${credits} Credits`,
      image: 'https://i.imgur.com/3g7nmJC.png',
      currency: orderData.currency,
      key: razorpayKeyId,
      amount: orderData.amount,
      name: 'SkillSwap',
      order_id: orderData.id,
      prefill: {
        email: userEmail || '',
        contact: userContact || '',
        name: '',
      },
      theme: { color: '#ff1a5c' },
    };

    const paymentData = await RazorpayCheckout.open(options);

    // 3. Verify Payment on Backend
    console.log('[Razorpay Service] Verifying payment:', paymentData.razorpay_payment_id);
    const verifyResult = await verifyRazorpayPayment({
      razorpay_order_id: paymentData.razorpay_order_id,
      razorpay_payment_id: paymentData.razorpay_payment_id,
      razorpay_signature: paymentData.razorpay_signature,
      credits: credits,
      amount: amount,
    });

    const verifyData = verifyResult.data as { success: boolean };
    return verifyData.success;

  } catch (error: any) {
    // Razorpay SDK errors have: { code, description, details }
    const rzpCode = error?.code;
    let rzpDescription = error?.description || error?.message || '';
    const rzpDetails = error?.details || {};

    // The description is sometimes a JSON string — parse it to get source/reason
    let parsedDesc: any = {};
    try {
      parsedDesc = typeof rzpDescription === 'string' ? JSON.parse(rzpDescription) : rzpDescription;
    } catch { /* not JSON, use as-is */ }

    const errorSource = parsedDesc?.error?.source || '';
    const errorReason = parsedDesc?.error?.reason || '';

    console.error('[Razorpay Service] Payment Error:', {
      code: rzpCode,
      description: rzpDescription,
      details: JSON.stringify(rzpDetails),
      source: errorSource,
      reason: errorReason,
    });

    // Customer-initiated cancellation — silent, no alert
    // Covers: code=2 (explicit cancel) AND code=0 with source=customer (back button/dismiss)
    if (rzpCode === 2 || errorSource === 'customer') {
      console.log('[Razorpay Service] User cancelled payment');
      return false;
    }

    // Code 0 with no customer source = real network error
    if (rzpCode === 0) {
      Alert.alert('Network Error', 'Please check your internet connection and try again.');
      return false;
    }

    // Code 1 = payment failed (most common in live mode issues)
    if (rzpCode === 1) {
      const detail = typeof rzpDetails === 'object'
        ? (rzpDetails?.reason || rzpDetails?.description || rzpDescription)
        : rzpDescription;
      Alert.alert(
        'Payment Failed',
        `${detail || 'The payment could not be processed.'}\n\nPlease try again or use a different payment method.`,
      );
      return false;
    }

    // Firebase function not found
    const code = String(rzpCode || '');
    const message = String(rzpDescription);
    const notFound =
      code.includes('functions/not-found') ||
      message.toLowerCase().includes('not found') ||
      message.toLowerCase().includes('404');

    if (notFound) {
      Alert.alert(
        'Service Unavailable',
        'Payment service is temporarily unavailable. Please try again later.',
      );
      return false;
    }

    Alert.alert(
      'Payment Failed',
      rzpDescription || 'Something went wrong during the payment process. Please try again.',
    );
    return false;
  }
}
