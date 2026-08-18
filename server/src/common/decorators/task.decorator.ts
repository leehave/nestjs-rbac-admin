import { SetMetadata } from '@nestjs/common';

export const TASK_METADATA = 'task_metadata';

export interface TaskMetadata {
  name: string;
  description?: string;
}

export class TaskRegistry {
  private static instance: TaskRegistry;
  private tasks = new Map<
    string,
    {
      classOrigin: any;
      methodName: string;
      metadata: TaskMetadata;
    }
  >();

  private constructor() {}

  static getInstance(): TaskRegistry {
    if (!TaskRegistry.instance) {
      TaskRegistry.instance = new TaskRegistry();
    }
    return TaskRegistry.instance;
  }

  register(target: any, methodName: string, metadata: TaskMetadata) {
    const classOrigin = target.constructor;
    this.tasks.set(metadata.name, { classOrigin, methodName, metadata });
  }

  getTasks() {
    return Array.from(this.tasks.values());
  }

  getTask(name: string) {
    return this.tasks.get(name);
  }
}

export const Task = (metadata: TaskMetadata): MethodDecorator => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(TASK_METADATA, metadata)(target, propertyKey, descriptor);
    TaskRegistry.getInstance().register(target, propertyKey.toString(), metadata);
    return descriptor;
  };
};
