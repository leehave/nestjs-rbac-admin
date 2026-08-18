import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_menu', { comment: '菜单权限表' })
export class SysMenuEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '菜单ID' })
  id: number;

  @Column({ type: 'bigint', name: 'parent_id', default: 0, comment: '父菜单ID' })
  parentId: number;

  @Column({ type: 'varchar', name: 'name', length: 64, comment: '菜单名称' })
  name: string;

  @Column({ type: 'varchar', name: 'code', length: 64, nullable: true, comment: '菜单代码' })
  code: string;

  @Column({ type: 'varchar', name: 'slug', length: 100, nullable: true, comment: '路由标识' })
  slug: string;

  @Column({ type: 'tinyint', name: 'type', default: 1, comment: '菜单类型（1目录 2菜单 3按钮/API）' })
  type: number;

  @Column({ type: 'varchar', name: 'path', length: 255, nullable: true, comment: '路由地址' })
  path: string;

  @Column({ type: 'varchar', name: 'component', length: 255, nullable: true, comment: '组件路径' })
  component: string;

  @Column({ type: 'varchar', name: 'method', length: 10, nullable: true, comment: '请求方式' })
  method: string;

  @Column({ type: 'varchar', name: 'icon', length: 64, nullable: true, comment: '菜单图标' })
  icon: string;

  @Column({ type: 'int', name: 'sort', default: 100, comment: '显示顺序' })
  sort: number;

  @Column({ type: 'varchar', name: 'link_url', length: 255, nullable: true, comment: '链接地址' })
  linkUrl: string;

  @Column({ type: 'tinyint', name: 'is_iframe', default: 2, comment: '是否为外链（1是 2否）' })
  isIframe: number;

  @Column({ type: 'tinyint', name: 'is_keep_alive', default: 2, comment: '是否缓存（1是 2否）' })
  isKeepAlive: number;

  @Column({ type: 'tinyint', name: 'is_hidden', default: 2, comment: '是否隐藏（1是 2否）' })
  isHidden: number;

  @Column({ type: 'tinyint', name: 'is_fixed_tab', default: 2, comment: '是否固定标签页（1是 2否）' })
  isFixedTab: number;

  @Column({ type: 'tinyint', name: 'is_full_page', default: 2, comment: '是否全屏（1是 2否）' })
  isFullPage: number;

  @Column({ type: 'int', name: 'generate_id', default: 0, comment: '生成ID' })
  generateId: number;

  @Column({ type: 'varchar', name: 'generate_key', length: 255, nullable: true, comment: '生成KEY' })
  generateKey: string;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态' })
  status: number;

  @Column({ type: 'tinyint', name: 'is_data_permission', default: 0, comment: '是否开启数据权限（1是 0否）' })
  isDataPermission: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;
}
