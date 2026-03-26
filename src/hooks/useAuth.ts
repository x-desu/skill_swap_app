import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

export const useAuth = () => useSelector((state: RootState) => state.auth);
export const useAuthDispatch = () => useDispatch<AppDispatch>();
