import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { deepXssSanitize } from '../utils/sanitize.util';
import { SensitiveWordService } from '../services/sensitive-word.service';

// SQL/Cypher 高危字符正则：防止拼接注入
const DANGER_SQL_CHAR_REG = /['";\\\/\(\)\[\]]/;

@Injectable()
export class GlobalSecurityInterceptor implements NestInterceptor {
  constructor(private readonly sensitiveWordService: SensitiveWordService) {}

  /**
   * 全局安全拦截器核心逻辑。
   * 1. 遍历 body / query / params 检测 SQL 高危字符和敏感词；
   * 2. 对全部入参执行 XSS 清洗（deepXssSanitize）；
   * 3. 对 body 执行敏感词脱敏（deepFilterSensitive）。
   * query 和 params 因只读属性需通过 defineProperty 覆写。
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpReq = context.switchToHttp().getRequest();

    // 1. 统一获取三处入参
    const { body, query, params } = httpReq;

    // 2. 前置校验：检测SQL高危字符 + 敏感词
    const checkRiskContent = (val: any, fieldName: string) => {
      if (typeof val !== 'string') return;
      // 检测SQL注入危险符号
      if (DANGER_SQL_CHAR_REG.test(val)) {
        //throw new BadRequestException(`参数${fieldName}包含非法SQL危险字符，禁止提交`);
      }
      // 检测敏感词
      if (this.sensitiveWordService.isContainSensitive(val)) {
        throw new BadRequestException(`参数${fieldName}包含违规敏感内容，请修改后重试`);
      }
    };

    // 递归遍历校验所有字符串
    const traverseCheck = (obj: any, prefix: string) => {
      if (typeof obj === 'string') {
        checkRiskContent(obj, prefix);
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => traverseCheck(item, `${prefix}[${idx}]`));
        return;
      }
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => traverseCheck(v, `${prefix}.${k}`));
      }
    };

    traverseCheck(body, 'body');
    traverseCheck(query, 'query');
    traverseCheck(params, 'params');

    // 3. XSS 全局清洗（body 可直接赋值，query/params 为只读 getter 需用 defineProperty）
    httpReq.body = deepXssSanitize(body);
    Object.defineProperty(httpReq, 'query', {
      value: deepXssSanitize(query),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(httpReq, 'params', {
      value: deepXssSanitize(params),
      writable: true,
      configurable: true,
    });

    // 4. 脱敏敏感词（放行场景用，拦截场景上面已经抛异常）
    httpReq.body = this.sensitiveWordService.deepFilterSensitive(httpReq.body);

    return next.handle();
  }
}