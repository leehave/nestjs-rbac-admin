import React, { useEffect, useMemo } from 'react';
import { Form, Select, Tree } from 'antd';
import { useToken } from '@ant-design/pro-components';
import { useControllableValue } from 'ahooks';

export interface MenuScopeNode {
  id: number | string;
  label: string;
  children?: MenuScopeNode[];
  is_data_permission?: number;
}

/** filter_type 阈值选项：0仅自己 1自己和下属 2无限制 */
export const DATA_SCOPE_FILTER_OPTIONS: DataScope.FilterOptions = [
  { value: 0, label: '仅自己' },
  { value: 1, label: '自己和下属' },
  { value: 2, label: '无限制' },
];

/** 隐藏字段占位组件：仅用于注册 menu_filters 字段，不渲染任何可见内容 */
const HiddenField: React.FC<{ value?: any; onChange?: (v: any) => void }> = () => null;

interface RoleMenuScopeTreeProps {
  value?: any[];
  defaultValue?: any[];
  onChange?: (value: any[]) => void;
  request: () => Promise<MenuScopeNode[]>;
}

/**
 * 从选中节点 ID 中提取“最终叶子节点”（即：没有选中后代的选中节点）
 */
function getLeafSelectedNodes(
  tree: MenuScopeNode[],
  selectedIds: (number | string)[],
): (number | string)[] {
  const selectedSet = new Set(selectedIds);
  const result: (number | string)[] = [];

  function traverse(node: MenuScopeNode): boolean {
    const { id, children = [] } = node;

    if (!selectedSet.has(id)) {
      return false;
    }

    let hasSelectedDescendant = false;
    for (const child of children) {
      if (traverse(child)) {
        hasSelectedDescendant = true;
      }
    }

    if (!hasSelectedDescendant) {
      result.push(id);
    }

    return true;
  }

  for (const root of tree) {
    if (root && typeof root === 'object' && 'id' in root) {
      traverse(root);
    }
  }

  return result;
}

/**
 * 角色-菜单数据权限树：在菜单勾选树上，为「开启数据权限」的菜单节点渲染
 * filter_type 选择器，并同步写入隐藏字段 menu_filters（等价 camel 的角色菜单阈值树）。
 */
const RoleMenuScopeTree: React.FC<RoleMenuScopeTreeProps> = ({
  request,
  value,
  defaultValue,
  onChange,
}) => {
  const { token } = useToken();
  const form = Form.useFormInstance();
  const [treeData, setTreeData] = React.useState<MenuScopeNode[]>([]);
  const [state, setState] = useControllableValue<any[]>(
    { defaultValue, value, onChange },
    { defaultValue: [] },
  );

  useEffect(() => {
    if (!request) return;
    request().then((res) => setTreeData(res || []));
  }, [request]);

  const menuFilters: DataScope.Item[] = Form.useWatch('menu_filters', form) || [];

  const filterMap = useMemo(() => {
    const map: Record<number, number> = {};
    menuFilters.forEach((f) => {
      map[Number(f.menu_id)] = Number(f.filter_type);
    });
    return map;
  }, [menuFilters]);

  const checkeds = useMemo(
    () => getLeafSelectedNodes(treeData, state),
    [treeData, state],
  );

  // 已分配（勾选或半勾选）的菜单 ID 集合，用于启用/禁用对应节点的阈值选择器
  const checkedSet = useMemo(() => new Set((state ?? []).map(Number)), [state]);

  const handleFilterChange = (menuId: number | string, filterType: number) => {
    const id = Number(menuId);
    const next = menuFilters.filter((f) => Number(f.menu_id) !== id);
    next.push({ menu_id: id, filter_type: filterType as DataScope.FilterType });
    form.setFieldValue('menu_filters', next);
  };

  const titleRender = (node: any) => {
    // antd 版本差异：原始节点可能挂在 node.data 上，或直接平铺在 node 上
    const origin = node?.data ?? node;
    const label = origin?.label ?? node?.title ?? '';
    const id = origin?.id ?? node?.key;
    const dataPermission = Number(origin?.is_data_permission ?? 0);

    if (dataPermission !== 1) {
      return <span>{label}</span>;
    }

    return (
      <span
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span>{label}</span>
        <Select
          size="small"
          style={{ width: 120 }}
          value={filterMap[Number(id)] ?? 0}
          disabled={!checkedSet.has(Number(id))}
          options={DATA_SCOPE_FILTER_OPTIONS}
          onClick={(e) => e.stopPropagation()}
          onChange={(val) => handleFilterChange(id, Number(val))}
        />
      </span>
    );
  };

  return (
    <>
      {treeData.length > 0 && (
        <div
          style={{
            padding: token.paddingSM,
            overflow: 'auto',
            height: 320,
            border: '1px solid ' + token.colorBorder,
            borderRadius: token.borderRadius,
          }}
        >
          <Tree
            checkedKeys={checkeds}
            treeData={treeData}
            fieldNames={{
              title: 'label',
              key: 'id',
              children: 'children',
            }}
            checkable
            defaultExpandAll
            titleRender={titleRender}
            onCheck={(v: any, { halfCheckedKeys }: any) => {
              setState([...new Set([...v, ...halfCheckedKeys])]);
            }}
          />
        </div>
      )}
      <Form.Item name="menu_filters" hidden>
        <HiddenField />
      </Form.Item>
    </>
  );
};

export default RoleMenuScopeTree;
