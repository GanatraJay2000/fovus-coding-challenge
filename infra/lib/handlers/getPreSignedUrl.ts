import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({});

export const handler = async (event: { body: string }) => {
  try {
    const bucketName = process.env.BUCKET_NAME;
    if (bucketName === undefined)
      throw new Error("Missing environment variable");

    const { fileName } = JSON.parse(event.body) as { fileName?: string };

    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      }),
      { expiresIn: 60 }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl }),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error generating pre-signed URL" }),
    };
  }
};
