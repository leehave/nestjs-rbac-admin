-- 补齐 web-antd 缺失页面菜单（可重复执行）
-- 说明：运行后需清除该用户菜单缓存或重新登录（access-menu 缓存 7200s）
-- 用法：mysql -h127.0.0.1 -uroot rbac_admin < database/web-antd-menu-seed.sql

INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT 1, '租户管理', 'system:tenant', 'core:tenant:index', 2, '/system/tenant', '@/pages/System/Tenant/index', NULL, 'TeamOutlined', 9, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'system:tenant');

INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT 1, '插件管理', 'system:plugin', 'system:plugin:index', 2, '/system/plugin', '@/pages/System/Plugin/index', NULL, 'ToolOutlined', 10, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'system:plugin');

INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT 9, '邮件日志', 'monitor:emailLog', 'core:email:index', 2, '/monitor/emailLog', '@/pages/Monitor/EmailLog/index', NULL, 'MailOutlined', 50, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'monitor:emailLog');

INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT 9, '附件管理', 'monitor:attachment', 'core:attachment:index', 2, '/monitor/attachment', '@/pages/Monitor/Attachment/index', NULL, 'FolderOutlined', 60, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'monitor:attachment');

INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT 9, '数据表维护', 'monitor:database', 'core:database:index', 2, '/monitor/database', '@/pages/Monitor/Database/index', NULL, 'DatabaseOutlined', 70, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'monitor:database');

INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT 9, 'Redis监控', 'monitor:redis', 'core:redis:index', 2, '/monitor/redis', '@/pages/Monitor/Redis/index', NULL, 'CloudServerOutlined', 80, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'monitor:redis');

-- 将新增菜单授权给角色 1（综管），幂等
INSERT INTO `sa_system_role_menu` (`role_id`, `menu_id`)
SELECT 1, m.id FROM `sa_system_menu` m
WHERE m.code IN ('system:tenant','system:plugin','monitor:emailLog','monitor:attachment','monitor:database','monitor:redis')
  AND NOT EXISTS (SELECT 1 FROM `sa_system_role_menu` rm WHERE rm.role_id = 1 AND rm.menu_id = m.id);
