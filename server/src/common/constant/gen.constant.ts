/** 代码生成相关常量 */
export const GEN = {
  /** 单表 */
  TPL_CRUD: 'crud',
  /** 树表 */
  TPL_TREE: 'tree',
  /** 主子表 */
  TPL_SUB: 'sub',

  /** 树表编码字段 */
  TREE_CODE: 'treeCode',
  /** 树表父编码字段 */
  TREE_PARENT_CODE: 'treeParentCode',
  /** 树表名称字段 */
  TREE_NAME: 'treeName',

  /** 前端代码生成路径 */
  FRONTEND_PATH: 'frontend',
};

/** 代码生成常量（server 兼容） */
export class GenConstants {
  public static readonly TPL_CRUD = 'crud';
  public static readonly TPL_TREE = 'tree';
  public static readonly TPL_SUB = 'sub';
  public static readonly TREE_CODE = 'treeCode';
  public static readonly TREE_PARENT_CODE = 'treeParentCode';
  public static readonly TREE_NAME = 'treeName';
  public static readonly PARENT_MENU_ID = 'parentMenuId';
  public static readonly PARENT_MENU_NAME = 'parentMenuName';
  public static readonly COLUMNTYPE_STR = ['char', 'varchar', 'nvarchar', 'varchar2'];
  public static readonly COLUMNTYPE_TEXT = ['tinytext', 'text', 'mediumtext', 'longtext'];
  public static readonly COLUMNTYPE_TIME = ['datetime', 'time', 'date', 'timestamp'];
  public static readonly COLUMNTYPE_NUMBER = ['tinyint', 'smallint', 'mediumint', 'int', 'number', 'integer', 'bit', 'bigint', 'float', 'double', 'decimal'];
  public static readonly COLUMNNAME_NOT_INSERT = ['id', 'create_by', 'create_time', 'del_flag'];
  public static readonly COLUMNNAME_NOT_EDIT = ['id', 'create_by', 'create_time', 'del_flag'];
  public static readonly COLUMNNAME_NOT_LIST = ['id', 'create_by', 'create_time', 'del_flag', 'update_by', 'update_time'];
  public static readonly COLUMNNAME_NOT_QUERY = ['id', 'create_by', 'create_time', 'del_flag', 'update_by', 'update_time', 'remark'];
  public static readonly BASE_ENTITY = ['createBy', 'createTime', 'updateBy', 'updateTime', 'remark'];
  public static readonly TREE_ENTITY = ['parentName', 'parentId', 'orderNum', 'ancestors', 'children'];
  public static readonly HTML_INPUT = 'input';
  public static readonly HTML_TEXTAREA = 'textarea';
  public static readonly HTML_SELECT = 'select';
  public static readonly HTML_RADIO = 'radio';
  public static readonly HTML_CHECKBOX = 'checkbox';
  public static readonly HTML_DATETIME = 'datetime';
  public static readonly HTML_IMAGE_UPLOAD = 'imageUpload';
  public static readonly HTML_FILE_UPLOAD = 'fileUpload';
  public static readonly HTML_EDITOR = 'editor';
  public static readonly TYPE_STRING = 'String';
  public static readonly TYPE_INTEGER = 'Integer';
  public static readonly TYPE_LONG = 'Long';
  public static readonly TYPE_DOUBLE = 'Double';
  public static readonly TYPE_BIGDECIMAL = 'BigDecimal';
  public static readonly TYPE_DATE = 'Date';
  public static readonly QUERY_EQ = 'EQ';
  public static readonly QUERY_NE = 'NE';
  public static readonly QUERY_GT = 'GT';
  public static readonly QUERY_GTE = 'GTE';
  public static readonly QUERY_LT = 'LT';
  public static readonly QUERY_LTE = 'LTE';
  public static readonly QUERY_LIKE = 'LIKE';
  public static readonly QUERY_BETWEEN = 'BETWEEN';
  public static readonly REQUIRE = '1';
  public static readonly NOT_REQUIRE = '0';
  public static readonly TYPE_NUMBER = 'Number';
}

/** 代码生成列类型 */
export const GEN_COLUMN = {
  /** 文本框 */
  INPUT: 'input',
  /** 文本域 */
  TEXTAREA: 'textarea',
  /** 下拉框 */
  SELECT: 'select',
  /** 单选框 */
  RADIO: 'radio',
  /** 复选框 */
  CHECKBOX: 'checkbox',
  /** 日期控件 */
  DATETIME: 'datetime',
  /** 图片上传 */
  IMAGE_UPLOAD: 'imageUpload',
  /** 文件上传 */
  FILE_UPLOAD: 'fileUpload',
  /** 富文本控件 */
  EDITOR: 'editor',
};
