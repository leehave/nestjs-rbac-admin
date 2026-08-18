import { Body, Controller, Get, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express-serve-static-core';
import { ResultData } from '../../../common/utils/result';
import { MindDocumentDeleteDto, MindDocumentDownloadDto, MindDocumentIndexStatusDto, MindDocumentPageDto, MindDocumentPreviewDto, MindDocumentReindexDto, MindDocumentWebsiteDto } from './dto';
import { MindDocumentService } from './mind-document.service';

@Controller('api/mind/document')
export class MindDocumentController {
  constructor(private readonly documentService: MindDocumentService) {}

  @Get('list')
  async list(@Query() query: MindDocumentPageDto) {
    return ResultData.ok(await this.documentService.page(query));
  }

  /**
   * 批量删除文档。
   * @param body - 包含逗号分隔的文档 ID 字符串
   */
  @Post('delete')
  async delete(@Body() body: MindDocumentDeleteDto) {
    const ids = String(body.ids || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    await this.documentService.deleteByIds(ids);
    return ResultData.ok(await this.documentService.page(body));
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) return ResultData.fail(500, '没有上传任何文件');
    const result = await this.documentService.uploadFile(file);
    return ResultData.ok(result, '上传成功，正在后台索引');
  }

  /**
   * 获取文档索引状态。
   * @param query - 包含逗号分隔的文档 ID 列表
   */
  @Get('index-status')
  async indexStatus(@Query() query: MindDocumentIndexStatusDto) {
    const ids = String(query.ids || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return ResultData.ok(await this.documentService.getIndexStatus(ids));
  }

  @Get('queue/status')
  async queueStatus() {
    return ResultData.ok(await this.documentService.getQueueControlStatus());
  }

  @Get('queue/health')
  async queueHealth() {
    return ResultData.ok(this.documentService.getQueueHealthStatus());
  }

  @Post('queue/pause')
  async pauseQueue() {
    return ResultData.ok(await this.documentService.pauseQueue(), '队列已暂停');
  }

  @Post('queue/resume')
  async resumeQueue() {
    return ResultData.ok(await this.documentService.resumeQueue(), '队列已恢复');
  }

  /**
   * 重新索引指定文档。
   * @param body - 包含逗号分隔的文档 ID 字符串
   */
  @Post('reindex')
  async reindex(@Body() body: MindDocumentReindexDto) {
    const ids = String(body.ids || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const result = await this.documentService.reindexByIds(ids);
    return ResultData.ok(result, `已加入队列 ${result.queued} 个文档`);
  }

  @Post('website')
  async website(@Body() body: MindDocumentWebsiteDto) {
    const result = await this.documentService.uploadWebsite(body.website);
    return ResultData.ok(result, '上传成功，正在后台索引');
  }

  @Get('preview')
  async preview(@Query() query: MindDocumentPreviewDto) {
    const content = await this.documentService.previewContent(query.documentName, query.documentType);
    return ResultData.ok(content);
  }

  @Post('download')
  async download(@Body() body: MindDocumentDownloadDto, @Res() res: Response) {
    const { filePath } = await this.documentService.loadRawFile(body.documentName);
    res.download(filePath, body.documentName);
  }
}
