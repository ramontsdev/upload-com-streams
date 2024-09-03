// src/UploadImage.tsx
import axios from 'axios';
import React from 'react';
import {ActivityIndicator, Button, Image, Platform, View} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import {SafeAreaView} from 'react-native-safe-area-context';

const API_URL = 'http://192.168.0.101:3000';

const UploadImage = () => {
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<ImagePicker.Asset | null>(
    null,
  );
  const [uploading, setUploading] = React.useState(false);

  const selectImage = async () => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
      },
      async response => {
        if (
          !response.didCancel &&
          !response.errorCode &&
          !response.errorMessage &&
          response.assets
        ) {
          if (response.assets[0].uri) {
            setImageUri(response.assets[0].uri);
          }
          setImageFile(response.assets[0]);
        }
      },
    );
  };

  async function handleUploadChunk() {
    if (!imageFile) {
      return;
    }

    const fileUri = imageFile.uri!;
    const file = await fetch(fileUri);
    const blob = await file.blob();

    // chunkSize of 256KB
    const chunkSize = 256 * 1024; // 256KB
    const totalChunks = Math.ceil(blob.size / chunkSize);
    let startByte = 0;
    setUploading(true);
    for (let i = 1; i <= totalChunks; i++) {
      const endByte = Math.min(startByte + chunkSize, blob.size);
      const chunk = blob.slice(startByte, endByte);
      await uploadChunk(chunk, totalChunks, i);
      startByte = endByte;
    }
    setUploading(false);
    console.log('Upload complete');
  }

  async function uploadChunk(
    chunk: Blob,
    totalChunks: number,
    currentChunk: number,
  ) {
    try {
      // Converter o chunk Blob para array de bytes usando FileReader
      const reader = new FileReader();

      reader.onloadend = async () => {
        const buffer = reader.result;

        const response = await axios.post(`${API_URL}/upload/chunk`, buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Total-Chunks': String(totalChunks),
            'X-Current-Chunk': String(currentChunk),
            'X-Original-File-Name': imageFile?.fileName || '',
          },
        });

        if (response.status !== 200) {
          throw new Error('Chunk upload failed');
        }
      };

      // Ler o chunk como um array buffer
      reader.readAsArrayBuffer(chunk);
    } catch (error) {
      console.error('Chunk upload failed:', error);
    }
  }

  async function testUpload() {
    const formData = new FormData();

    formData.append('file', {
      name: imageFile?.fileName,
      type: imageFile?.type,
      uri:
        Platform.OS === 'ios'
          ? imageFile?.uri?.replace('file://', '')
          : imageFile?.uri,
    });

    await axios.post(`${API_URL}/upload`, formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
  }

  return (
    <SafeAreaView>
      <View>
        <Button title="Select Image" onPress={selectImage} />
        {imageUri && (
          <Image source={{uri: imageUri}} style={{width: 100, height: 100}} />
        )}
        <Button
          title="Upload Image"
          onPress={handleUploadChunk}
          disabled={uploading}
        />
        <Button title="Test API" onPress={testUpload} />
        {uploading && <ActivityIndicator size="large" />}
      </View>
    </SafeAreaView>
  );
};

export default UploadImage;
