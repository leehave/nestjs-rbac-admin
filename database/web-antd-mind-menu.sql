-- ============================================================
-- 知识库（Mind）菜单脚本（可重复执行）
--
-- 数据库：fssoa-net
-- 作用：新建「知识库」一级菜单，下设「知识库管理」「文档检索」两个子菜单，
--       并授权给管理员角色（综管 admin）。
--
-- 说明：运行后需清除菜单缓存或重新登录（菜单缓存 key: sys_menu:*）
-- 用法：mysql -h127.0.0.1 -uroot fssoa-net < database/web-antd-mind-menu.sql
-- ============================================================

-- 1) 顶级目录「知识库」
INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT 0, '知识库', 'mind', '', 1, '/mind', '', NULL, 'BookOutlined', 4, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'mind');

-- 2) 「知识库管理」菜单
INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT (SELECT id FROM `sa_system_menu` WHERE `code` = 'mind' LIMIT 1),
       '知识库管理', 'mind:document', 'mind:document:use', 2, '/mind/document', '@/pages/Mind/Document/index', NULL, 'FolderOutlined', 10, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'mind:document');

-- 3) 「文档检索」菜单
INSERT INTO `sa_system_menu`
  (`parent_id`, `name`, `code`, `slug`, `type`, `path`, `component`, `method`, `icon`, `sort`, `link_url`,
   `is_iframe`, `is_keep_alive`, `is_hidden`, `is_fixed_tab`, `is_full_page`, `generate_id`, `generate_key`, `status`, `remark`)
SELECT (SELECT id FROM `sa_system_menu` WHERE `code` = 'mind' LIMIT 1),
       '文档检索', 'mind:retrieval', 'mind:retrieval:use', 2, '/mind/retrieval', '@/pages/Mind/Retrieval/index', NULL, 'FileSearchOutlined', 20, NULL,
       2, 2, 2, 2, 2, 0, NULL, 1, ''
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sa_system_menu` WHERE `code` = 'mind:retrieval');

-- 4) 将知识库菜单授权给管理员角色（综管 admin），幂等
INSERT INTO `sa_system_role_menu` (`role_id`, `menu_id`)
SELECT r.id, m.id
FROM `sa_system_role` r
JOIN `sa_system_menu` m ON m.code IN ('mind', 'mind:document', 'mind:retrieval')
WHERE r.code = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM `sa_system_role_menu` rm WHERE rm.role_id = r.id AND rm.menu_id = m.id
  );
