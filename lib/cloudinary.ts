/** Uploads an image (local file URI) to the app's Cloudinary account and returns its public URL. */
export async function uploadImageToCloudinary(imageUri: string): Promise<string> {
  const data = new FormData();
  data.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "upload.jpg",
  } as unknown as Blob);
  data.append("upload_preset", "playbuddy");
  data.append("cloud_name", "dyyb2dkgx");

  const res = await fetch("https://api.cloudinary.com/v1_1/dyyb2dkgx/image/upload", {
    method: "POST",
    body: data,
  });

  const result = await res.json();
  return result.secure_url;
}
