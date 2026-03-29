import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

const FUNCTIONS_REGION = 'asia-south1';

/** Server-side spend; requires deployed `spendCredits` callable in the same region. */
export async function spendCreditsOnServer(amount: number, reason = 'credit_spend'): Promise<void> {
  const callable = httpsCallable(getFunctions(undefined, FUNCTIONS_REGION), 'spendCredits');
  await callable({ amount, reason });
}
