const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const uploadToS3 = async (fileBuffer, fileName, mimeType, folder = 'profiles') => {
  try {
    const uniqueFileName = `${uuidv4()}-${Date.now()}${path.extname(fileName)}`;
    const key = `${process.env.S3_PREFIX}${folder}/${uniqueFileName}`;

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: process.env.S3_ACL || 'public-read',
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload image to S3');
  }
};

const deleteFromS3 = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    // Extract the key from the full URL
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    console.log(`Deleted S3 object: ${key}`);
  } catch (error) {
    console.error('S3 delete error:', error);
    // Don't throw - deletion failure shouldn't fail the operation
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
};
