declare namespace DataScope {
  /** 数据权限阈值：0=仅自己 1=自己和下属 2=无限制 */
  type FilterType = 0 | 1 | 2;

  /** 角色-菜单数据权限阈值项（后端 sa_system_role_menu_filter） */
  type Item = {
    menu_id: number;
    filter_type: FilterType;
  };

  /** filter_type 下拉选项 */
  type FilterOptions = Array<{ value: FilterType; label: string }>;
}
