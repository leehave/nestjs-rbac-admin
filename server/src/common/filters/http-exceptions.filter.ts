import { Catch, HttpException, ExceptionFilter, ArgumentsHost } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionsFilter implements ExceptionFilter {
  /**
   * HTTP 异常过滤器核心逻辑。
   * 捕获所有 HttpException，提取状态码与错误消息，统一返回 JSON 格式响应。
   * 消息支持字符串或字符串数组两种形式，数组时取第一个元素。
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as { message?: string | string[] } | undefined;
    let message = exceptionResponse?.message ?? 'Service Error';

    if (Array.isArray(message)) {
      message = message[0];
    }

    response.status(200).json({
      code: status,
      msg: message,
      message: message,
      data: null,
    });
  }
}
