const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomBytes } = require('crypto');
const sharp = require('sharp');

const makeS3Client = () => {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const accountId = process.env.R2_ACCOUNT_ID;
  
  const s3Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: 'auto',
    endpoint: s3Endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });
};

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const s3 = makeS3Client();
    const bucket = process.env.R2_BUCKET_NAME;

    const isImage = req.file.mimetype && req.file.mimetype.startsWith('image/');

    let fileBuffer = req.file.buffer;
    let contentType = req.file.mimetype;
    let ext = 'webp';

    if (isImage) {
      try {
        const isPng = /png/i.test(req.file.mimetype);
        const isJpeg = /jpe?g/i.test(req.file.mimetype);

        const webpOpts = isPng
          ? {
              quality: 82,
              alphaQuality: 95,
              chromaSubsampling: '4:4:4',
              smartSubsample: true,
              effort: 6,
            }
          : {
              quality: 80,
              alphaQuality: 90,
              chromaSubsampling: '4:2:0',
              smartSubsample: true,
              effort: 6,
            };

        fileBuffer = await sharp(req.file.buffer)
          .rotate()
          .webp(webpOpts)
          .toBuffer();

        contentType = 'image/webp';
        ext = 'webp';
      } catch (conversionError) {
        contentType = req.file.mimetype;
        ext = (req.file.originalname.split('.').pop() || '').toLowerCase() || 'bin';
        fileBuffer = req.file.buffer;
      }
    } else {
      ext = (req.file.originalname.split('.').pop() || '').toLowerCase() || 'bin';
      fileBuffer = req.file.buffer;
      contentType = req.file.mimetype;
    }

    const key = `uploads/${randomBytes(8).toString('hex')}-${Date.now()}.${ext}`;

    const params = {
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    };

    await s3.send(new PutObjectCommand(params));

    const publicEndpoint = process.env.R2_PUBLIC_ENDPOINT || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;
    const url = `${publicEndpoint}/${key}`;

    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const key = decodeURIComponent(req.params.key);
    
    if (!key) {
      return res.status(400).json({ 
        success: false, 
        message: 'File key is required' 
      });
    }

    const s3 = makeS3Client();
    const bucket = process.env.R2_BUCKET_NAME;

    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3.send(command);

    return res.status(200).json({ 
      success: true, 
      message: 'File deleted successfully' 
    });
  } catch (err) {
    next(err);
  }
};
