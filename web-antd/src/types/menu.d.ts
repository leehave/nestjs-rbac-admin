declare namespace Menu {
  type Item = {
    menuId: number;
    menuName: string;
    parentId: number;
    orderNum: number;
    path: string;
    component: string | null;
    query: string | null;
    isFrame: string;
    isCache: string;
    menuType: string;
    visible: string;
    status: string;
    perms: string | null;
    icon: string;
    createBy: string;
    createTime: string;
    updateBy: string;
    updateTime: string;
    remark: string;
    /** 是否开启数据权限：1是 0否 */
    is_data_permission?: number;
    /** 角色-菜单数据权限阈值：0仅自己 1自己和下属 2无限制 */
    filter_type?: number;
  };
}
