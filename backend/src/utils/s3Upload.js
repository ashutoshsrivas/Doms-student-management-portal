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
    const key = `${process.env.S3_PREFIX || ''}${folder}/${uniqueFileName}`;

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
    const url = new URL(imageUrl);
    const key = url.pathname.substring(1);
    await s3.deleteObject({ Bucket: process.env.S3_BUCKET, Key: key }).promise();
    console.log(`Deleted S3 object: ${key}`);
  } catch (error) {
    console.error('S3 delete error:', error);
  }
};

const deleteFromS3ByKey = async (key) => {
  if (!key) return;
  await s3.deleteObject({ Bucket: process.env.S3_BUCKET, Key: key }).promise();
  console.log(`Deleted S3 object: ${key}`);
};

const listS3Objects = async (prefix = '') => {
  const allObjects = [];
  let continuationToken = undefined;

  do {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    };
    const result = await s3.listObjectsV2(params).promise();
    allObjects.push(...(result.Contents || []));
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return allObjects;
};

const copyS3Object = async (sourceKey, destKey) => {
  await s3.copyObject({
    Bucket: process.env.S3_BUCKET,
    CopySource: `${process.env.S3_BUCKET}/${sourceKey}`,
    Key: destKey,
    ACL: process.env.S3_ACL || 'public-read',
  }).promise();
};

const getS3ObjectUrl = (key) => {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  // Buckets with dots must use path-style URLs (SSL wildcard cert limitation)
  if (bucket && bucket.includes('.')) {
    return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const getS3ObjectStream = (key) =>
  s3.getObject({ Bucket: process.env.S3_BUCKET, Key: key }).createReadStream();

module.exports = {
  uploadToS3,
  deleteFromS3,
  deleteFromS3ByKey,
  listS3Objects,
  copyS3Object,
  getS3ObjectUrl,
  getS3ObjectStream,
};
