/**
 * 文件上传路由
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { success, error } = require('../utils/response');
const { authMiddleware } = require('../middleware/auth');

const uploadDir = process.env.UPLOAD_PATH || path.resolve(process.cwd(), '../uploads/');
const fullUploadDir = path.resolve(uploadDir);

if (!fs.existsSync(fullUploadDir)) {
  fs.mkdirSync(fullUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    var dateDir = new Date().toISOString().slice(0, 10);
    var targetDir = path.join(fullUploadDir, dateDir);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    cb(null, targetDir);
  },
  filename: function(req, file, cb) {
    var ext = path.extname(file.originalname);
    var filename = uuidv4() + ext;
    cb(null, filename);
  },
});

var fileFilter = function(req, file, cb) {
  var allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型，仅支持 JPG、PNG、GIF、WEBP'), false);
  }
};

var upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  },
});

router.post('/', authMiddleware, upload.single('file'), function(req, res) {
  try {
    if (!req.file) {
      return error(res, '请选择要上传的文件', 400);
    }

    var file = req.file;
    var relativePath = path.relative(fullUploadDir, file.path);
    
    var protocol = req.protocol;
    var host = req.get('host');
    var fileUrl = protocol + '://' + host + '/uploads/' + relativePath.replace(/\\/g, '/');

    logger.info('文件上传成功', {
      originalName: file.originalname,
      size: file.size,
      url: fileUrl,
    });

    return success(res, {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    });
  } catch (err) {
    logger.error('文件上传失败', { error: err.message });
    return error(res, '文件上传失败', 500);
  }
});

router.post('/multiple', authMiddleware, upload.array('files', 5), function(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return error(res, '请选择要上传的文件', 400);
    }

    var protocol = req.protocol;
    var host = req.get('host');
    
    var files = req.files.map(function(file) {
      var relativePath = path.relative(fullUploadDir, file.path);
      return {
        url: protocol + '://' + host + '/uploads/' + relativePath.replace(/\\/g, '/'),
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    });

    logger.info('多文件上传成功', { count: files.length });

    return success(res, { files: files });
  } catch (err) {
    logger.error('多文件上传失败', { error: err.message });
    return error(res, '文件上传失败', 500);
  }
});

module.exports = router;
