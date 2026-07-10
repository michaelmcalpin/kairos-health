/**
 * Reusable image picker utility for the Everist.ai mobile app.
 *
 * Wraps expo-image-picker to provide camera and photo library access
 * with permission handling and a convenient action-sheet chooser.
 */

import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileName?: string;
}

/** Request camera permission and take a photo */
export async function takePhoto(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Camera Permission",
      "Please enable camera access in your device settings to take photos.",
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    type: asset.mimeType ?? "image/jpeg",
    fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
  };
}

/** Pick an image from the photo library */
export async function pickFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Photo Library Permission",
      "Please enable photo library access in your device settings.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    type: asset.mimeType ?? "image/jpeg",
    fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
  };
}

/** Show action sheet for camera or library choice */
export async function showImagePickerOptions(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Camera", onPress: async () => resolve(await takePhoto()) },
      {
        text: "Photo Library",
        onPress: async () => resolve(await pickFromLibrary()),
      },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}
