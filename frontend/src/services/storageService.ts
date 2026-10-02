import { apiClient } from './apiClient';

export interface UploadResponse {
  url: string;
  path: string;
}

export const storageService = {
  /**
   * Upload single image (products, brands, categories)
   */
  uploadSingle: async (
    file: File,
    folder: 'products' | 'brands' | 'categories',
    onProgress?: (percent: number) => void,
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post(`/storage/upload/${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    const data = res.data?.data ?? res.data;
    return data;
  },

  /**
   * Upload multiple images for variant gallery (up to 5 images)
   */
  uploadGallery: async (files: File[]): Promise<UploadResponse[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await apiClient.post('/storage/upload-gallery', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = res.data?.data ?? res.data;
    return data;
  },

  /**
   * Upload user avatar
   */
  uploadAvatar: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post('/storage/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    const data = res.data?.data ?? res.data;
    return data;
  },

  /**
   * Delete uploaded asset
   */
  deleteAsset: async (path: string): Promise<void> => {
    await apiClient.delete('/storage/delete', { data: { path } });
  },
};
