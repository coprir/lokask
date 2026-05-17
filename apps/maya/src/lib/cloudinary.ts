import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export async function uploadImage(
  buffer: Buffer | string,
  options: {
    folder?: string;
    public_id?: string;
    transformation?: object[];
  } = {}
): Promise<{ url: string; publicId: string }> {
  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder ?? "maya-ai",
          public_id: options.public_id,
          transformation: options.transformation ?? [
            { quality: "auto", fetch_format: "auto" },
          ],
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!);
        }
      );

      if (typeof buffer === "string") {
        cloudinary.uploader.upload(buffer, {
          folder: options.folder ?? "maya-ai",
        }).then(resolve).catch(reject);
      } else {
        uploadStream.end(buffer);
      }
    }
  );

  return { url: result.secure_url, publicId: result.public_id };
}

export async function uploadAudio(
  buffer: Buffer,
  options: { folder?: string; public_id?: string } = {}
): Promise<{ url: string; publicId: string }> {
  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder ?? "maya-ai/voice",
          public_id: options.public_id,
          resource_type: "video",
          format: "mp3",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!);
        }
      );
      uploadStream.end(buffer);
    }
  );
  return { url: result.secure_url, publicId: result.public_id };
}
