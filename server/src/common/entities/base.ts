import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Column } from 'typeorm';

/** 业务表基类 — 子类需自行声明 @PrimaryGeneratedColumn id */
export abstract class BaseEntity {
  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true, comment: '创建者' })
  createdBy?: number;

  @Column({ name: 'updated_by', type: 'int', nullable: true, comment: '更新者' })
  updatedBy?: number;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, comment: '删除时间（软删除）' })
  deleteTime?: Date;
}
