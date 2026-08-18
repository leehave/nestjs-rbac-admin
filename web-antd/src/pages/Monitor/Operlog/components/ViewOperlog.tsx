import React, { useState } from 'react';
import { Modal } from 'antd';
import { ProDescriptions } from '@ant-design/pro-components';
import { T } from '@/locales';
import { queryDictsByType } from '@/services/dict';

interface ViewOperlogWrapperForm {
  values?: any;
}

interface ViewOperlogForm extends ViewOperlogWrapperForm {
  trigger: JSX.Element;
}

const ViewOperlogWrapperForm: React.FC<ViewOperlogWrapperForm> = (props) => {
  const { values } = props;

  return (
    <ProDescriptions layout="vertical" column={2}>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.operModule" />}
        valueType="text"
        span={2}
      >
        {values.app}
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.loginInfo" />}
        valueType="text"
        span={2}
      >
        {values.username} / {values.ip} ({values.ip_location})
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.url" />}
        valueType="text"
      >
        {values.router}
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.reqMethod" />}
        valueType="text"
      >
        {values.method}
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.operMethod" />}
        valueType="text"
      >
        {values.method}
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.operStatus" />}
        valueType="radio"
        request={async () => {
          const res = await queryDictsByType('sys_common_status');
          return res.data.map((dict) => ({
            label: dict.label,
            value: dict.value,
          }));
        }}
      >
        {values.status}
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.req" />}
        valueType="jsonCode"
      >
        {values.request_data}
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.res" />}
        valueType="jsonCode"
      >
        {values.remark}
      </ProDescriptions.Item>
      <ProDescriptions.Item
        label={<T id="page.operlog.field.timer" />}
        valueType="digit"
      >
        {values.duration}
      </ProDescriptions.Item>
    </ProDescriptions>
  );
};

const ViewOperlogForm: React.FC<ViewOperlogForm> = (props) => {
  const { trigger, ...rest } = props;
  const [visible, setVisible] = useState<boolean>(false);

  return (
    <>
      {React.cloneElement(trigger, {
        onClick: () => setVisible(true),
      })}
      <Modal
        open={visible}
        title={
          <T
            id="component.form.view"
            values={{ title: <T id="page.operlog.title" /> }}
          />
        }
        width={800}
        footer={null}
        destroyOnHidden
        onCancel={() => setVisible(false)}
      >
        <ViewOperlogWrapperForm {...rest} />
      </Modal>
    </>
  );
};

export default ViewOperlogForm;
