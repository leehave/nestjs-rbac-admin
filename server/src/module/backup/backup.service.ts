import { Injectable } from '@nestjs/common';
import { Task } from '../../common/decorators/task.decorator';

@Injectable()
export class BackupService {
  @Task({
    name: 'dailyBackup',
    description: '每日备份任务',
  })
  async performBackup(params: string) {
    console.log('performBackup', params);
  }
}
