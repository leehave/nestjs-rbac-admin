-- =============================================================
-- 数据权限改造（对齐 Camelus）
-- 1) 菜单表新增 is_data_permission 开关
-- 2) 新增角色-菜单数据权限阈值表 sa_system_role_menu_filter
-- =============================================================

-- 1) 是否开启数据权限（幂等：存在则跳过）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sa_system_menu'
    AND COLUMN_NAME = 'is_data_permission'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sa_system_menu` ADD COLUMN `is_data_permission` tinyint(1) NOT NULL DEFAULT 0 COMMENT ''是否开启数据权限（1是 0否）'' AFTER `status`;',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 角色-菜单数据权限阈值表（幂等；列类型与 BaseEntity/TypeORM 对齐，避免 synchronize 反复 ALTER）
CREATE TABLE IF NOT EXISTS `sa_system_role_menu_filter` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `menu_id` bigint NOT NULL COMMENT '菜单ID',
  `filter_type` tinyint NOT NULL DEFAULT 0 COMMENT '数据权限阈值：0仅自己 1自己和下属 2无',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `created_by` int DEFAULT NULL COMMENT '创建者',
  `updated_by` int DEFAULT NULL COMMENT '更新者',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='角色-菜单数据权限阈值表';
