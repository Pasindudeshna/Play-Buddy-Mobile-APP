// Same Cloudinary account/unsigned preset used by the mobile app's KYC
// upload (app/(auth)/registration/Signupkyc.tsx) — kept in sync manually
// since this is a separate package.
const CLOUD_NAME = "dyyb2dkgx";
const UPLOAD_PRESET = "playbuddy";

/** Uploads a browser File to Cloudinary and returns its secure URL. */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);
  data.append("cloud_name", CLOUD_NAME);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: data,
  });
  if (!res.ok) {
    throw new Error("Image upload failed. Please try again.");
  }
  const result = await res.json();
  return result.secure_url as string;
}
