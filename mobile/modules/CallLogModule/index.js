import { requireNativeModule } from 'expo-modules-core';

const CallLogNativeModule = requireNativeModule('CallLogModule');

export async function getAll() {
  return CallLogNativeModule.getAll();
}
