/**
 * cosController 单元测试
 * COS 控制器测试
 */

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../src/utils/response', () => ({
  success: jest.fn((res, data) => res.json({ code: 0, data })),
  error: jest.fn((res, message, code, statusCode) => {
    res.status(statusCode || code || 500).json({ code: code || 500, message });
  }),
}));

jest.mock('../../../src/utils/cosService', () => ({
  getUploadSign: jest.fn(),
  getTempFileUrl: jest.fn(),
  deleteFile: jest.fn(),
}));

const logger = require('../../../src/utils/logger');
const cosService = require('../../../src/utils/cosService');
const {
  getUploadSign,
  getTempFileUrl,
  deleteFile,
} = require('../../../src/controllers/cosController');

describe('cosController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { userId: 'user_123' },
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getUploadSign', () => {
    it('成功获取上传签名', async () => {
      req.body = {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      };

      cosService.getUploadSign.mockResolvedValue({
        uploadUrl: 'https://upload.example.com',
        token: 'upload_token',
        authorization: 'auth_string',
        fileId: 'file_123',
        fileUrl: 'https://test-bucket.tcb.qcloud.la/uploads/user_123/test.jpg',
        key: 'uploads/user_123/2024-01-01/test.jpg',
        expiresIn: 3600,
      });

      await getUploadSign(req, res);

      expect(cosService.getUploadSign).toHaveBeenCalledWith({
        key: expect.stringContaining('uploads/user_123/'),
        userId: 'user_123',
      });
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: expect.objectContaining({
          uploadUrl: 'https://upload.example.com',
          token: 'upload_token',
        }),
      });
    });

    it('处理缺少文件名', async () => {
      req.body = {};

      await getUploadSign(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '文件名不能为空',
      });
    });

    it('使用默认 contentType', async () => {
      req.body = {
        filename: 'test.jpg',
      };

      cosService.getUploadSign.mockResolvedValue({
        uploadUrl: 'https://upload.example.com',
        token: 'upload_token',
        key: 'uploads/user_123/test.jpg',
      });

      await getUploadSign(req, res);

      expect(cosService.getUploadSign).toHaveBeenCalled();
    });

    it('处理服务错误', async () => {
      req.body = {
        filename: 'test.jpg',
      };

      cosService.getUploadSign.mockRejectedValue(new Error('Service error'));

      await getUploadSign(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: expect.stringContaining('获取上传链接失败'),
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('生成正确的文件路径格式', async () => {
      req.body = {
        filename: 'my-photo.png',
      };

      cosService.getUploadSign.mockImplementation(({ key }) => {
        return Promise.resolve({
          uploadUrl: 'https://upload.example.com',
          token: 'token',
          key,
        });
      });

      await getUploadSign(req, res);

      const callArg = cosService.getUploadSign.mock.calls[0][0];
      expect(callArg.key).toMatch(/^uploads\/user_123\/\d{4}-\d{2}-\d{2}\/\d+-[a-z0-9]+\.png$/);
    });

    it('处理无扩展名的文件使用原文件名作为扩展名', async () => {
      req.body = {
        filename: 'noextension',
      };

      cosService.getUploadSign.mockImplementation(({ key }) => {
        return Promise.resolve({
          uploadUrl: 'https://upload.example.com',
          token: 'token',
          key,
        });
      });

      await getUploadSign(req, res);

      const callArg = cosService.getUploadSign.mock.calls[0][0];
      // 当没有扩展名时，pop() 返回整个字符串，所以 key 会以 'noextension' 结尾
      expect(callArg.key).toContain('.noextension');
    });
  });

  describe('getTempFileUrl', () => {
    it('成功获取临时文件链接', async () => {
      req.body = {
        fileId: 'cloud://test_env.test-bucket/uploads/test.jpg',
      };

      cosService.getTempFileUrl.mockResolvedValue('https://temp.example.com/signed.jpg');

      await getTempFileUrl(req, res);

      expect(cosService.getTempFileUrl).toHaveBeenCalledWith(
        'cloud://test_env.test-bucket/uploads/test.jpg',
        3600
      );
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: {
          tempFileUrl: 'https://temp.example.com/signed.jpg',
          expiresIn: 3600,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[COS Controller] 获取临时访问链接成功',
        expect.any(Object)
      );
    });

    it('处理缺少 fileId', async () => {
      req.body = {};

      await getTempFileUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '文件 fileId 不能为空',
      });
    });

    it('处理获取临时链接失败', async () => {
      req.body = {
        fileId: 'cloud://test_env.test-bucket/uploads/test.jpg',
      };

      cosService.getTempFileUrl.mockResolvedValue(null);

      await getTempFileUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: '无法获取临时访问链接',
      });
    });

    it('处理服务错误', async () => {
      req.body = {
        fileId: 'cloud://test_env.test-bucket/uploads/test.jpg',
      };

      cosService.getTempFileUrl.mockRejectedValue(new Error('Service error'));

      await getTempFileUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: expect.stringContaining('获取临时访问链接失败'),
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('成功删除文件', async () => {
      req.body = {
        fileId: 'cloud://test_env.test-bucket/uploads/test.jpg',
      };

      cosService.deleteFile.mockResolvedValue(true);

      await deleteFile(req, res);

      expect(cosService.deleteFile).toHaveBeenCalledWith(
        'cloud://test_env.test-bucket/uploads/test.jpg'
      );
      expect(res.json).toHaveBeenCalledWith({
        code: 0,
        data: { message: '删除成功' },
      });
      expect(logger.info).toHaveBeenCalledWith(
        '[COS Controller] 删除文件成功',
        expect.any(Object)
      );
    });

    it('处理缺少 fileId', async () => {
      req.body = {};

      await deleteFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 400,
        message: '文件 fileId 不能为空',
      });
    });

    it('处理删除失败', async () => {
      req.body = {
        fileId: 'cloud://test_env.test-bucket/uploads/test.jpg',
      };

      cosService.deleteFile.mockRejectedValue(new Error('Delete failed'));

      await deleteFile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 500,
        message: expect.stringContaining('删除文件失败'),
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
