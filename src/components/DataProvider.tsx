import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { AppDispatch, RootState } from '../store';
import { setMatches, clearMatches } from '../store/matchesSlice';
import { setRoomMessages, clearChat } from '../store/chatSlice';
import { clearDiscovery } from '../store/discoverySlice';
import { MatchDocument, MessageDocument } from '../types/user';

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const matches = useSelector((state: RootState) => state.matches.list);

  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged((user) => {
      if (!user) {
        dispatch(clearMatches());
        dispatch(clearChat());
        dispatch(clearDiscovery());
      }
    });
    return unsubscribeAuth;
  }, [dispatch]);

  // Global Matches Listener
  useEffect(() => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const unsubscribeMatches = firestore()
      .collection('matches')
      .where('users', 'array-contains', currentUser.uid)
      .orderBy('matchedAt', 'desc')
      .onSnapshot((snapshot) => {
        if (!snapshot) return;

        const updatedMatches: MatchDocument[] = [];
        snapshot.docs.forEach((doc) => {
          updatedMatches.push({ id: doc.id, ...doc.data() } as MatchDocument);
        });

        dispatch(setMatches(updatedMatches));
      });

    return () => unsubscribeMatches();
  }, [dispatch]);

  return <>{children}</>;
}
