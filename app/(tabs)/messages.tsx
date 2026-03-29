import React from 'react';
import { Redirect } from 'expo-router';

export default function MessagesScreen() {
  return <Redirect href={{ pathname: '/(tabs)/matches', params: { tab: 'messages' } }} />;
}
