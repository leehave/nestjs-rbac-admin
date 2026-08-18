import React, { useRef } from 'react';
import { Button, Space, message, Tooltip, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  ActionType,
  PageContainer,
  ProTable,
  ProColumns,
  ProForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
  ProFormTreeSelect,
  ProFormDependency,
} from '@ant-design/pro-components';
import { queryDictsByType } from '@/services/dict';
import { queryMenuList, queryMenuTree, deleteMenu } from '@/services/menu';
import { arrayToTree } from '@/utils/data';
import { PermissionGuard } from '@/components/Layout';
import { rawT, useT, T } from '@/locales';
import CreateMenuForm from './components/CreateMenuForm';
import UpdateMenuForm from './components/UpdateMenuForm';
import icons from '@/constants/icons';

/**
 *  删除节点
 * @param selectedRows
 */
const handleRemove = async (selectedRows: API.UserInfo[]) => {
  const hide = message.loading(rawT('component.form.message.delete.loading'));
  if (!selectedRows) return true;
  try {
    await deleteMenu(selectedRows.map((row) => row.id).join(','));
    hide();
    message.success(rawT('component.form.message.delete.success'));
    return true;
  } catch {
    hide();
    message.success(rawT('component.form.message.delete.error'));
    return false;
  }
};

export const Component: React.FC<unknown> = () => {
  const t = useT();
  const actionRef = useRef<ActionType>();

  const columns: ProColumns[] = [
    {
      title: <T id="page.menu.field.menuName" />,
      dataIndex: 'name',
      valueType: 'text',
    },
    {
      title: <T id="page.menu.field.menuIcon" />,
      dataIndex: 'icon',
      valueType: 'text',
      width: 140,
      hideInSearch: true,
      render: (_, item) => {
        const Icon = icons[item.icon];
        return Icon ? <Icon /> : null;
      },
    },
    {
      title: <T id="page.menu.field.authKey" />,
      dataIndex: 'code',
      valueType: 'text',
      width: 220,
      hideInSearch: true,
    },
    {
      title: <T id="component.field.sort" />,
      dataIndex: 'sort',
      valueType: 'text',
      width: 120,
      hideInSearch: true,
    },
    {
      title: <T id="component.field.status" />,
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: <T id="dict.status.normal" />, status: 'MALE' },
        1: { text: <T id="dict.status.disable" />, status: 'FEMALE' },
      },
      width: 120,
    },
    {
      title: <T id="component.field.createTime" />,
      dataIndex: 'create_time',
      valueType: 'dateTime',
      width: 220,
      hideInSearch: true,
    },
    {
      title: <T id="component.table.action" />,
      width: 140,
      dataIndex: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (_, record) => (
        <Space direction="horizontal" size={16}>
          <PermissionGuard key="save" requireds={['core:menu:save']}>
            <CreateMenuForm
              values={{ parentId: record.id }}
              formRender={formRender}
              trigger={
                <Tooltip title={<T id="component.tooltip.add" />}>
                  <Button type="link" size="small" icon={<PlusOutlined />} />
                </Tooltip>
              }
              onFinish={() => {
                actionRef.current?.reload();
              }}
            />
          </PermissionGuard>
          <PermissionGuard key="update" requireds={['core:menu:update']}>
            <UpdateMenuForm
              values={record}
              formRender={formRender}
              trigger={
                <Tooltip title={<T id="component.tooltip.update" />}>
                  <Button type="link" size="small" icon={<EditOutlined />} />
                </Tooltip>
              }
              onFinish={() => {
                actionRef.current?.reload();
              }}
            />
          </PermissionGuard>
          <PermissionGuard key="destroy" requireds={['core:menu:destroy']}>
            <Popconfirm
              title={<T id="component.confirm.delete" />}
              description={<T id="component.confirm.delete.desc" />}
              onConfirm={async () => {
                await handleRemove([record]);
                actionRef.current?.reloadAndRest?.();
              }}
            >
              <Tooltip title={<T id="component.tooltip.delete" />}>
                <Button type="link" size="small" icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </PermissionGuard>
        </Space>
      ),
    },
  ];

  const formRender = (
    <>
      <ProFormTreeSelect
        name="parentId"
        label={<T id="page.menu.field.menuParent" />}
        placeholder={t('component.form.placeholder.sel', {
          label: t('page.menu.field.menuParent'),
        })}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder.sel', {
              label: t('page.menu.field.menuParent'),
            }),
          },
        ]}
        initialValue={0}
        fieldProps={{
          fieldNames: { label: 'label', value: 'id', children: 'children' },
        }}
        request={async () => {
          const res = await queryMenuTree();
          return [
            {
              id: 0,
              label: <T id="page.menu.root" />,
              children: arrayToTree(res.data, { keyField: 'id' }),
            },
          ];
        }}
      />
      <ProFormSelect
        name="type"
        label={<T id="page.menu.field.menuType" />}
        initialValue={1}
        options={[
          { label: <T id="page.menu.type.option.m" />, value: 1 },
          { label: <T id="page.menu.type.option.c" />, value: 2 },
          { label: <T id="page.menu.type.option.f" />, value: 3 },
        ]}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder.sel', {
              label: t('page.menu.field.menuType'),
            }),
          },
        ]}
      />
      <ProFormDependency name={['type']}>
        {({ type }) => (
          <>
            <ProForm.Group>
              <ProFormText
                name="name"
                label={<T id="page.menu.field.menuName" />}
                placeholder={t('component.form.placeholder', {
                  label: t('page.menu.field.menuName'),
                })}
                rules={[
                  {
                    required: true,
                    message: t('component.form.placeholder', {
                      label: t('page.menu.field.menuName'),
                    }),
                  },
                ]}
              />
              {[1].includes(type) && (
                <ProFormSelect
                  name="icon"
                  label={<T id="page.menu.field.menuIcon" />}
                  placeholder={t('component.form.placeholder.sel', {
                    label: t('page.menu.field.menuIcon'),
                  })}
                  showSearch
                  fieldProps={{
                    optionRender: (option) => (
                      <Space>
                        {option.data.icon}
                        {option.data.label}
                      </Space>
                    ),
                  }}
                  options={Object.entries(icons).map(
                    ([key, IconComponent]) => {
                      const Icon = IconComponent as React.ComponentType;
                      return {
                        icon: <Icon />,
                        label: key,
                        value: key,
                      };
                    },
                  )}
                />
              )}
              {[1, 2].includes(type) && (
                <ProFormText
                  name="i18nKey"
                  label={<T id="page.menu.field.i18nKey" />}
                  placeholder={t('component.form.placeholder', {
                    label: t('page.menu.field.i18nKey'),
                  })}
                />
              )}
            </ProForm.Group>
            {[2].includes(type) && (
              <ProFormSelect
                name="is_iframe"
                label={<T id="page.menu.field.isLink" />}
                initialValue={2}
                options={[
                  { label: <T id="dict.status.true" />, value: 1 },
                  { label: <T id="dict.status.false" />, value: 2 },
                ]}
                rules={[
                  {
                    required: true,
                    message: t('component.form.placeholder.sel', {
                      label: t('page.menu.field.isLink'),
                    }),
                  },
                ]}
              />
            )}

            <ProForm.Group>
              {[1, 2].includes(type) && (
                <ProFormText
                  name="path"
                  label={<T id="page.menu.field.route" />}
                  placeholder={t('component.form.placeholder', {
                    label: t('page.menu.field.route'),
                  })}
                  rules={[
                    {
                      required: true,
                      message: t('component.form.placeholder', {
                        label: t('page.menu.field.route'),
                      }),
                    },
                  ]}
                />
              )}
              {[2].includes(type) && (
                <ProFormText
                  name="query"
                  label={<T id="page.menu.field.params" />}
                  placeholder={t('component.form.placeholder', {
                    label: t('page.menu.field.params'),
                  })}
                />
              )}
              {[2].includes(type) && (
                <ProFormText
                  name="component"
                  label={<T id="page.menu.field.component" />}
                  placeholder={t('component.form.placeholder', {
                    label: t('page.menu.field.component'),
                  })}
                />
              )}
            </ProForm.Group>
            {[2, 3].includes(type) && (
              <ProFormText
                name="code"
                label={<T id="page.menu.field.authKey" />}
                placeholder={t('component.form.placeholder', {
                  label: t('page.menu.field.authKey'),
                })}
              />
            )}
            <ProFormDigit
              name="sort"
              label={<T id="component.field.sort" />}
              placeholder={t('component.field.sort.placeholder')}
              min={1}
              rules={[
                {
                  required: true,
                  message: t('component.field.sort.placeholder'),
                },
              ]}
              fieldProps={{ precision: 0 }}
            />
            {[2].includes(type) && (
              <ProFormSelect
                name="is_keep_alive"
                label={<T id="page.menu.field.isCache" />}
                initialValue={2}
                options={[
                  { label: <T id="dict.status.true" />, value: 1 },
                  { label: <T id="dict.status.false" />, value: 2 },
                ]}
              />
            )}
            {[2, 3].includes(type) && (
              <ProFormSelect
                name="is_data_permission"
                label={<T id="page.role.field.authScope" />}
                initialValue={0}
                options={[
                  { label: <T id="dict.status.false" />, value: 0 },
                  { label: <T id="dict.status.true" />, value: 1 },
                ]}
              />
            )}
            <ProForm.Group>
              {[1, 2].includes(type) && (
                <ProFormSelect
                  name="is_hidden"
                  label={<T id="page.menu.field.status.visible" />}
                  initialValue={2}
                  options={[
                    { label: t('dict.status.show'), value: 1 },
                    { label: t('dict.status.hide'), value: 2 },
                  ]}
                />
              )}
              <ProFormSelect
                name="status"
                label={<T id="page.menu.field.status.menu" />}
                initialValue={1}
                options={[
                  { label: t('dict.status.normal'), value: 1 },
                  { label: t('dict.status.disable'), value: 0 },
                ]}
              />
            </ProForm.Group>
          </>
        )}
      </ProFormDependency>
    </>
  );

  return (
    <PageContainer
      header={{
        title: <T id="menu.system.menu" />,
      }}
    >
      <ProTable
        headerTitle={<T id="component.table.title" />}
        actionRef={actionRef}
        rowKey="id"
        toolBarRender={() => [
          <PermissionGuard key="save2" requireds={['core:menu:save']}>
            <CreateMenuForm
              formRender={formRender}
              trigger={
                <Button type="primary" icon={<PlusOutlined />} key="add">
                  <T id="component.table.tool.add" />
                </Button>
              }
            />
          </PermissionGuard>,
        ]}
        request={async (params, sorter, filter) => {
          const { data } = await queryMenuList({
            ...params,
            // FIXME: remove @ts-ignore
            // @ts-ignore
            sorter,
            filter,
          });
          return {
            data: data,
            success: true,
          };
        }}
        postData={(rows: any) => {
          return arrayToTree(rows, { keyField: 'id' });
        }}
        columns={columns}
        pagination={false}
        scroll={{ x: 1400 }}
      />
    </PageContainer>
  );
};
