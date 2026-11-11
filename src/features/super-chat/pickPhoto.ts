import * as ImagePicker from 'expo-image-picker';

/** Opens the photo library. Returns null if the landlord cancels. No permission prompt is needed for the library. */
export async function pickPhoto(): Promise<{ uri: string; aspectRatio: number } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const aspectRatio = asset.width && asset.height ? asset.width / asset.height : 4 / 3;
  return { uri: asset.uri, aspectRatio };
}
