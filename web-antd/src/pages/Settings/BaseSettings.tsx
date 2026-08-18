import { App, Button } from 'antd';
import { ProForm, ProFormText, ProFormRadio } from '@ant-design/pro-components';
import { useT, T } from '@/locales';
import { queryDictsByType } from '@/services/dict';
import { getProfile, updateProfile } from '@/services/system';

const BaseSettings = () => {
  const app = App.useApp();
  const t = useT();

  return (
    <ProForm
      layout="horizontal"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 14 }}
      grid
      rowProps={{ gutter: [16, 0] }}
      colProps={{ span: 20 }}
      request={async () => {
        const res = await getProfile();
        const data = res.data || res;
        return {
          ...data,
          deptStr: data?.department?.name || '',
          roleStr: (data?.roles || []).join(', '),
        };
      }}
      submitter={{
        render: ({ form }) => {
          return [
            <Button
              type="primary"
              key="submit"
              onClick={() => form?.submit?.()}
            >
              <T id="settings.form.updateSubmit" />
            </Button>,
          ];
        },
      }}
      onFinish={async (formValues) => {
        const { deptStr, roleStr, ...data } = formValues;
        const hide = app.message.loading(
          t('component.form.message.update.loading'),
        );
        try {
          await updateProfile({ ...data });
          hide();
          app.message.success(t('component.form.message.update.success'));
          return true;
        } catch {
          hide();
          app.message.error(t('component.form.message.update.error'));
          return false;
        }
      }}
    >
      <ProFormText
        name="realname"
        label={<T id="settings.basic.nickname" />}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('settings.basic.nickname'),
            }),
          },
        ]}
      />
      <ProFormText
        name="phone"
        label={<T id="settings.basic.phone" />}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('settings.basic.phone'),
            }),
          },
        ]}
      />
      <ProFormText
        name="email"
        label={<T id="settings.basic.email" />}
        rules={[
          {
            required: true,
            message: t('component.form.placeholder', {
              label: t('settings.basic.email'),
            }),
          },
        ]}
      />
      <ProFormRadio.Group
        layout="horizontal"
        name="gender"
        label={<T id="settings.basic.sex" />}
        request={async () => {
          const res = await queryDictsByType('sys_user_sex');
          return res.data.map((dict) => ({
            label: dict.label,
            value: Number(dict.value),
          }));
        }}
      />
    </ProForm>
  );
};

export default BaseSettings;
