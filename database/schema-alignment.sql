-- =============================================================
-- 表结构对齐：t_* 表补齐审计字段与软删除，并补上缺失的建表语句
--
-- 背景：
--   database/init.sql 里的表分成两套约定。sa_* 是本系统自己的表，实体统一
--   继承 BaseEntity，因此都有 created_by / updated_by / create_time /
--   update_time / delete_time，删除走软删除。t_* 是从上游 mind 项目整体
--   移植进来的知识库子系统，只有 create_time，没有审计字段和软删除，
--   tenant_id 也靠服务层手写传入。
--   另外 sa_system_plugin 与 t_user_profile 两张表此前只有实体、没有建表
--   语句，仅靠 synchronize 在应用启动时创建，用 database/*.sql 还原的库会缺表。
--
-- 本脚本做四件事：
--   1) 为 5 张 t_* 表补齐 update_time / created_by / updated_by / delete_time
--   2) 把 create_time 的类型对齐 BaseEntity 的推导类型
--      （datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)），否则 synchronize
--      每次启动都会反复 ALTER。列内已有的 NULL 会先补上再收紧。
--      t_system_document 原本没有 create_time，新增后从 upload_time 回填。
--   3) 修正 t_system_document.status 的类型漂移（mediumint -> tinyint）
--   4) 补齐 sa_system_plugin / t_user_profile 的建表语句
--
-- 幂等：本脚本是「按状态幂等」的——每一步都先查 information_schema 再决定是否
--       执行 DDL，因此重复执行不会重建表、不会改数据。
--       注意 init.sql 现在直接产出目标结构，所以在「全新装载 init.sql 的库」上
--       执行本脚本是完全的空转（全部走 SELECT 1 分支），不会有副作用。
--
-- 部署顺序：对**已存在的旧库**，先跑本脚本，再把应用以 DB_SYNC=false 启动。
--           顺序反了会在 t_* 表上出现 Unknown column 'delete_time'。
--           对该库的**全新部署**，只需 init.sql，无需本脚本。
--
-- 已知遗留：sa_system_plugin.name 有唯一约束，软删除一个插件后再注册同名插件
--           会撞唯一键。这是既有设计问题，本脚本不处理。
-- =============================================================


-- -------------------------------------------------------------
-- 1) t_history_record
-- -------------------------------------------------------------

-- 1.1 补齐审计字段与软删除（以 delete_time 是否存在判断整组是否已应用）
SET @applied := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_history_record'
    AND COLUMN_NAME = 'delete_time'
);
SET @ddl := IF(@applied = 0,
  'ALTER TABLE `t_history_record`
     ADD COLUMN `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT ''更新时间'',
     ADD COLUMN `created_by` int DEFAULT NULL COMMENT ''创建者'',
     ADD COLUMN `updated_by` int DEFAULT NULL COMMENT ''更新者'',
     ADD COLUMN `delete_time` datetime(6) DEFAULT NULL COMMENT ''删除时间（软删除）'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.2 create_time 类型对齐 BaseEntity（已是目标类型则跳过，避免无谓的表重建）
UPDATE `t_history_record` SET `create_time` = NOW() WHERE `create_time` IS NULL;
SET @needs_norm := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_history_record'
    AND COLUMN_NAME = 'create_time'
    AND (COLUMN_TYPE <> 'datetime(6)' OR IS_NULLABLE <> 'NO' OR COLUMN_DEFAULT IS NULL)
);
SET @ddl := IF(@needs_norm > 0,
  'ALTER TABLE `t_history_record`
     MODIFY COLUMN `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT ''创建时间'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -------------------------------------------------------------
-- 2) t_memory_detail
-- -------------------------------------------------------------

SET @applied := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_memory_detail'
    AND COLUMN_NAME = 'delete_time'
);
SET @ddl := IF(@applied = 0,
  'ALTER TABLE `t_memory_detail`
     ADD COLUMN `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT ''更新时间'',
     ADD COLUMN `created_by` int DEFAULT NULL COMMENT ''创建者'',
     ADD COLUMN `updated_by` int DEFAULT NULL COMMENT ''更新者'',
     ADD COLUMN `delete_time` datetime(6) DEFAULT NULL COMMENT ''删除时间（软删除）'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `t_memory_detail` SET `create_time` = NOW() WHERE `create_time` IS NULL;
SET @needs_norm := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_memory_detail'
    AND COLUMN_NAME = 'create_time'
    AND (COLUMN_TYPE <> 'datetime(6)' OR IS_NULLABLE <> 'NO' OR COLUMN_DEFAULT IS NULL)
);
SET @ddl := IF(@needs_norm > 0,
  'ALTER TABLE `t_memory_detail`
     MODIFY COLUMN `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT ''创建时间'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -------------------------------------------------------------
-- 3) t_system_model
-- -------------------------------------------------------------

SET @applied := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_system_model'
    AND COLUMN_NAME = 'delete_time'
);
SET @ddl := IF(@applied = 0,
  'ALTER TABLE `t_system_model`
     ADD COLUMN `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT ''更新时间'',
     ADD COLUMN `created_by` int DEFAULT NULL COMMENT ''创建者'',
     ADD COLUMN `updated_by` int DEFAULT NULL COMMENT ''更新者'',
     ADD COLUMN `delete_time` datetime(6) DEFAULT NULL COMMENT ''删除时间（软删除）'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `t_system_model` SET `create_time` = NOW() WHERE `create_time` IS NULL;
SET @needs_norm := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_system_model'
    AND COLUMN_NAME = 'create_time'
    AND (COLUMN_TYPE <> 'datetime(6)' OR IS_NULLABLE <> 'NO' OR COLUMN_DEFAULT IS NULL)
);
SET @ddl := IF(@needs_norm > 0,
  'ALTER TABLE `t_system_model`
     MODIFY COLUMN `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT ''创建时间'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -------------------------------------------------------------
-- 4) t_system_setting
-- -------------------------------------------------------------

SET @applied := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_system_setting'
    AND COLUMN_NAME = 'delete_time'
);
SET @ddl := IF(@applied = 0,
  'ALTER TABLE `t_system_setting`
     ADD COLUMN `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT ''更新时间'',
     ADD COLUMN `created_by` int DEFAULT NULL COMMENT ''创建者'',
     ADD COLUMN `updated_by` int DEFAULT NULL COMMENT ''更新者'',
     ADD COLUMN `delete_time` datetime(6) DEFAULT NULL COMMENT ''删除时间（软删除）'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `t_system_setting` SET `create_time` = NOW() WHERE `create_time` IS NULL;
SET @needs_norm := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_system_setting'
    AND COLUMN_NAME = 'create_time'
    AND (COLUMN_TYPE <> 'datetime(6)' OR IS_NULLABLE <> 'NO' OR COLUMN_DEFAULT IS NULL)
);
SET @ddl := IF(@needs_norm > 0,
  'ALTER TABLE `t_system_setting`
     MODIFY COLUMN `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT ''创建时间'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -------------------------------------------------------------
-- 5) t_system_document
--    该表原本没有 create_time（用 upload_time 表达上传时间），
--    先新增可空列，从 upload_time 回填以保留真实时间，再收紧为 NOT NULL。
--    upload_time 作为业务字段保留，语义是「文件的上传时刻」。
-- -------------------------------------------------------------

-- 5.1 新增 create_time（可空）
SET @has_ct := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_system_document'
    AND COLUMN_NAME = 'create_time'
);
SET @ddl := IF(@has_ct = 0,
  'ALTER TABLE `t_system_document`
     ADD COLUMN `create_time` datetime(6) NULL COMMENT ''创建时间（由 upload_time 回填）'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5.2 用 upload_time 回填，只补 NULL，不覆盖已有值（保证可重复执行）
UPDATE `t_system_document`
  SET `create_time` = `upload_time`
  WHERE `create_time` IS NULL AND `upload_time` IS NOT NULL;

-- 5.3 兜底：upload_time 也为空的极少数行用当前时间填充，避免下一步收紧失败
UPDATE `t_system_document` SET `create_time` = NOW() WHERE `create_time` IS NULL;

-- 5.4 收紧为 NOT NULL 并对齐 BaseEntity（已是目标类型则跳过）
SET @needs_norm := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_system_document'
    AND COLUMN_NAME = 'create_time'
    AND (COLUMN_TYPE <> 'datetime(6)' OR IS_NULLABLE <> 'NO' OR COLUMN_DEFAULT IS NULL)
);
SET @ddl := IF(@needs_norm > 0,
  'ALTER TABLE `t_system_document`
     MODIFY COLUMN `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT ''创建时间'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5.5 补齐审计字段与软删除
SET @applied := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_system_document'
    AND COLUMN_NAME = 'delete_time'
);
SET @ddl := IF(@applied = 0,
  'ALTER TABLE `t_system_document`
     ADD COLUMN `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT ''更新时间'',
     ADD COLUMN `created_by` int DEFAULT NULL COMMENT ''创建者'',
     ADD COLUMN `updated_by` int DEFAULT NULL COMMENT ''更新者'',
     ADD COLUMN `delete_time` datetime(6) DEFAULT NULL COMMENT ''删除时间（软删除）'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5.6 修正既有漂移：实体声明 tinyint，DDL 是 mediumint(5)
--     先兜底 NULL，否则收紧为 NOT NULL 会失败
UPDATE `t_system_document` SET `status` = 0 WHERE `status` IS NULL;
SET @needs_fix := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_system_document'
    AND COLUMN_NAME = 'status'
    AND COLUMN_TYPE <> 'tinyint'
);
SET @ddl := IF(@needs_fix > 0,
  'ALTER TABLE `t_system_document`
     MODIFY COLUMN `status` tinyint NOT NULL DEFAULT 0 COMMENT ''分析状态：0未完成，1完成'';',
  'SELECT 1;');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -------------------------------------------------------------
-- 6) sa_system_plugin（此前只有实体，没有建表语句）
--    列类型对齐 TypeORM/BaseEntity，避免 synchronize 反复 ALTER；
--    唯一键名与 PluginEntity 上的 @Unique('uk_plugin_name') 一致。
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sa_system_plugin` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '插件ID',
  `name` varchar(100) NOT NULL COMMENT '插件名称',
  `title` varchar(200) NOT NULL COMMENT '插件标题',
  `description` text NULL COMMENT '插件描述',
  `version` varchar(20) NOT NULL COMMENT '版本号',
  `author` varchar(100) DEFAULT NULL COMMENT '作者',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '状态（0未安装 1已安装 2已启用）',
  `config` text NULL COMMENT '插件配置(JSON)',
  `created_by` int DEFAULT NULL COMMENT '创建者',
  `updated_by` int DEFAULT NULL COMMENT '更新者',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_plugin_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='插件表';


-- -------------------------------------------------------------
-- 7) t_user_profile（此前只有实体，没有建表语句）
--    该表实体已正确继承 BaseEntity，因此建表即包含全部审计字段。
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `t_user_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenant_id` bigint NOT NULL COMMENT '租户ID',
  `user_id` bigint NOT NULL COMMENT '用户ID(sa_system_user.id)',
  `resume` longtext NULL COMMENT '个人简介',
  `photo` longtext NULL COMMENT '头像(base64等)',
  `created_by` int DEFAULT NULL COMMENT '创建者',
  `updated_by` int DEFAULT NULL COMMENT '更新者',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `delete_time` datetime(6) DEFAULT NULL COMMENT '删除时间（软删除）',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='Mind 用户扩展表';
